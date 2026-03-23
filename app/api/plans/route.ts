import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { WeekPlan } from '@/app/types';

/** Resolve whether this user's plans live under a householdId or their own userId. */
async function resolveScope(userId: string): Promise<
  | { type: 'household'; householdId: string }
  | { type: 'user'; userId: string }
> {
  // Check if owner
  const owned = await prisma.household.findUnique({ where: { ownerId: userId }, select: { id: true } });
  if (owned) return { type: 'household', householdId: owned.id };

  // Check if member
  const membership = await prisma.householdMember.findUnique({
    where: { userId },
    select: { householdId: true },
  });
  if (membership) return { type: 'household', householdId: membership.householdId };

  return { type: 'user', userId };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const scope = await resolveScope(session.user.id);

  const plans = scope.type === 'household'
    ? await prisma.weekPlan.findMany({ where: { householdId: scope.householdId } })
    : await prisma.weekPlan.findMany({ where: { userId: scope.userId } });

  const result: WeekPlan[] = plans.map((p) => ({
    weekStart: p.weekStart,
    ...(p.data as object),
  } as WeekPlan));

  return NextResponse.json(result);
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const plan: WeekPlan = await req.json();
  const { weekStart, ...rest } = plan;

  const scope = await resolveScope(session.user.id);

  if (scope.type === 'household') {
    await prisma.weekPlan.upsert({
      where: { householdId_weekStart: { householdId: scope.householdId, weekStart } },
      update: { data: rest as object },
      create: {
        householdId: scope.householdId,
        weekStart,
        data: rest as object,
      },
    });
  } else {
    await prisma.weekPlan.upsert({
      where: { userId_weekStart: { userId: scope.userId, weekStart } },
      update: { data: rest as object },
      create: {
        userId: scope.userId,
        weekStart,
        data: rest as object,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
