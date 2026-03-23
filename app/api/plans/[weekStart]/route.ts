import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

async function resolveScope(userId: string) {
  const owned = await prisma.household.findUnique({ where: { ownerId: userId }, select: { id: true } });
  if (owned) return { type: 'household' as const, householdId: owned.id };

  const membership = await prisma.householdMember.findUnique({
    where: { userId },
    select: { householdId: true },
  });
  if (membership) return { type: 'household' as const, householdId: membership.householdId };

  return { type: 'user' as const, userId };
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ weekStart: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { weekStart } = await params;
  const decoded = decodeURIComponent(weekStart);
  const scope = await resolveScope(session.user.id);

  await prisma.weekPlan.deleteMany({
    where: scope.type === 'household'
      ? { householdId: scope.householdId, weekStart: decoded }
      : { userId: scope.userId, weekStart: decoded },
  });

  return NextResponse.json({ ok: true });
}
