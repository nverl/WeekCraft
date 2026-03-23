import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/** GET /api/household — return the caller's household info (or null) */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user.id;

  // User may be an owner or a member
  const owned = await prisma.household.findUnique({
    where: { ownerId: userId },
    include: {
      members: { include: { user: { select: { id: true, username: true } } } },
      invites: {
        where: { acceptedAt: null, expiresAt: { gt: new Date() } },
        select: { id: true, token: true, note: true, createdAt: true, expiresAt: true },
      },
    },
  });

  if (owned) {
    return NextResponse.json({
      id: owned.id,
      name: owned.name,
      role: 'owner',
      members: owned.members.map((m) => ({
        userId: m.userId,
        username: m.user.username,
        joinedAt: m.joinedAt,
      })),
      pendingInvites: owned.invites,
    });
  }

  const membership = await prisma.householdMember.findUnique({
    where: { userId },
    include: {
      household: {
        include: {
          owner: { select: { id: true, username: true } },
          members: { include: { user: { select: { id: true, username: true } } } },
        },
      },
    },
  });

  if (membership) {
    return NextResponse.json({
      id: membership.household.id,
      name: membership.household.name,
      role: 'member',
      ownerUsername: membership.household.owner.username,
      members: membership.household.members.map((m) => ({
        userId: m.userId,
        username: m.user.username,
        joinedAt: m.joinedAt,
      })),
      pendingInvites: [],
    });
  }

  return NextResponse.json(null);
}

/** POST /api/household — create a household (caller becomes owner) */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user.id;

  // Can't create if already owner or member
  const existing = await prisma.household.findUnique({ where: { ownerId: userId } });
  if (existing) return NextResponse.json({ error: 'You already own a household' }, { status: 409 });

  const member = await prisma.householdMember.findUnique({ where: { userId } });
  if (member) return NextResponse.json({ error: 'You are already in a household' }, { status: 409 });

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 60) : "My Household";

  const household = await prisma.household.create({
    data: { name, ownerId: userId },
  });

  return NextResponse.json({ id: household.id, name: household.name }, { status: 201 });
}

/** PATCH /api/household — rename the household (owner only) */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const household = await prisma.household.findUnique({ where: { ownerId: session.user.id } });
  if (!household) return NextResponse.json({ error: 'Not the household owner' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 60) : household.name;

  const updated = await prisma.household.update({ where: { id: household.id }, data: { name } });
  return NextResponse.json({ name: updated.name });
}

/** DELETE /api/household — owner dissolves household; member leaves */
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user.id;

  const owned = await prisma.household.findUnique({ where: { ownerId: userId } });
  if (owned) {
    // Deleting household cascades members + invites + household week plans
    await prisma.household.delete({ where: { id: owned.id } });
    return NextResponse.json({ ok: true, action: 'dissolved' });
  }

  const member = await prisma.householdMember.findUnique({ where: { userId } });
  if (member) {
    await prisma.householdMember.delete({ where: { userId } });
    return NextResponse.json({ ok: true, action: 'left' });
  }

  return NextResponse.json({ error: 'Not in any household' }, { status: 404 });
}
