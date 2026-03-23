import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/** DELETE /api/household/member/[userId] — owner removes a member */
export async function DELETE(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { userId: targetUserId } = await params;

  // Verify caller is the household owner
  const household = await prisma.household.findUnique({ where: { ownerId: session.user.id } });
  if (!household) return NextResponse.json({ error: 'Not the household owner' }, { status: 403 });

  // Can't remove yourself (owner)
  if (targetUserId === session.user.id) {
    return NextResponse.json({ error: 'Owner cannot remove themselves. Dissolve the household instead.' }, { status: 400 });
  }

  await prisma.householdMember.deleteMany({
    where: { householdId: household.id, userId: targetUserId },
  });

  return NextResponse.json({ ok: true });
}
