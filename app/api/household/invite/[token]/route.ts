import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/** GET /api/household/invite/[token] — preview invite (name of household, who sent it) */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const invite = await prisma.householdInvite.findUnique({
    where: { token },
    include: {
      household: { select: { id: true, name: true } },
      invitedBy: { select: { username: true } },
    },
  });

  if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  if (invite.acceptedAt) return NextResponse.json({ error: 'Invite already used' }, { status: 410 });
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: 'Invite has expired' }, { status: 410 });

  return NextResponse.json({
    householdName: invite.household.name,
    invitedBy: invite.invitedBy.username,
    note: invite.note,
    expiresAt: invite.expiresAt,
  });
}

/** POST /api/household/invite/[token] — accept invite */
export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { token } = await params;
  const userId = session.user.id;

  const invite = await prisma.householdInvite.findUnique({
    where: { token },
    include: { household: true },
  });

  if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  if (invite.acceptedAt) return NextResponse.json({ error: 'Invite already used' }, { status: 410 });
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: 'Invite has expired' }, { status: 410 });

  // Can't join if already in a household (as owner or member)
  const ownedHousehold = await prisma.household.findUnique({ where: { ownerId: userId } });
  if (ownedHousehold) return NextResponse.json({ error: 'You already own a household. Leave it first.' }, { status: 409 });

  const existingMembership = await prisma.householdMember.findUnique({ where: { userId } });
  if (existingMembership) {
    if (existingMembership.householdId === invite.householdId) {
      return NextResponse.json({ error: 'You are already in this household' }, { status: 409 });
    }
    return NextResponse.json({ error: 'You are already in another household. Leave it first.' }, { status: 409 });
  }

  // Can't accept your own invite
  if (invite.invitedById === userId) {
    return NextResponse.json({ error: 'You cannot accept your own invite' }, { status: 400 });
  }

  // Transaction: mark invite as accepted + add member
  await prisma.$transaction([
    prisma.householdInvite.update({
      where: { token },
      data: { acceptedAt: new Date() },
    }),
    prisma.householdMember.create({
      data: { householdId: invite.householdId, userId },
    }),
  ]);

  return NextResponse.json({ ok: true, householdId: invite.householdId });
}

/** DELETE /api/household/invite/[token] — owner revokes an invite */
export async function DELETE(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { token } = await params;

  const invite = await prisma.householdInvite.findUnique({
    where: { token },
    include: { household: true },
  });

  if (!invite) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (invite.household.ownerId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.householdInvite.delete({ where: { token } });
  return NextResponse.json({ ok: true });
}
