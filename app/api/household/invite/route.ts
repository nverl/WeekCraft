import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

/** POST /api/household/invite — owner creates an invite link (returns token) */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Rate limit: 20 invites per hour per user
  if (!checkRateLimit(`invite:${session.user.id}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many invites sent. Try again later.' }, { status: 429 });
  }

  const household = await prisma.household.findUnique({ where: { ownerId: session.user.id } });
  if (!household) {
    return NextResponse.json({ error: 'You must own a household to invite members' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 200) : null;

  // Expires in 7 days
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invite = await prisma.householdInvite.create({
    data: {
      householdId: household.id,
      invitedById: session.user.id,
      note,
      expiresAt,
    },
  });

  return NextResponse.json({
    token: invite.token,
    expiresAt: invite.expiresAt,
    inviteUrl: `/invite/${invite.token}`,
  }, { status: 201 });
}

/** GET /api/household/invite — list pending invites for owner */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const household = await prisma.household.findUnique({ where: { ownerId: session.user.id } });
  if (!household) return NextResponse.json([], { status: 200 });

  const invites = await prisma.householdInvite.findMany({
    where: {
      householdId: household.id,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(invites.map((i) => ({
    id: i.id,
    token: i.token,
    note: i.note,
    expiresAt: i.expiresAt,
    createdAt: i.createdAt,
    inviteUrl: `/invite/${i.token}`,
  })));
}
