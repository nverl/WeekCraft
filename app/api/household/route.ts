import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/household
 * Returns the caller's owned household with full management details (members, invites).
 * Used by the Settings page for household management.
 * For the lightweight list of all households (owned + member), use GET /api/households.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user.id;

  // Return owned household with full management data
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

  return NextResponse.json(null);
}

/** POST /api/household — create a household (caller becomes owner) */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user.id;

  // Can't create if already owns a household
  const existing = await prisma.household.findUnique({ where: { ownerId: userId } });
  if (existing) return NextResponse.json({ error: 'You already own a household' }, { status: 409 });

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 60) : 'My Household';

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

/**
 * DELETE /api/household
 * - No query param → dissolves the caller's owned household (owner only)
 * - ?householdId={id} → leave that specific household as a member
 */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user.id;
  const { searchParams } = new URL(req.url);
  const householdId = searchParams.get('householdId');

  if (householdId) {
    // Leave a specific household as a member
    const membership = await prisma.householdMember.findFirst({
      where: { userId, householdId },
    });
    if (!membership) return NextResponse.json({ error: 'You are not a member of this household' }, { status: 404 });

    await prisma.householdMember.delete({
      where: { householdId_userId: { householdId, userId } },
    });
    return NextResponse.json({ ok: true, action: 'left' });
  }

  // No householdId → dissolve owned household
  const owned = await prisma.household.findUnique({ where: { ownerId: userId } });
  if (owned) {
    // Cascade deletes members + invites + household week plans
    await prisma.household.delete({ where: { id: owned.id } });
    return NextResponse.json({ ok: true, action: 'dissolved' });
  }

  return NextResponse.json({ error: 'Not the owner of any household' }, { status: 404 });
}
