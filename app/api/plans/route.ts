import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { WeekPlan } from '@/app/types';

/**
 * Resolve the plan scope from the ?scope= query param.
 * scope = 'personal' → user's own plans
 * scope = <householdId> → household plans (user must be owner or member)
 * Returns null if the user does not have access to the requested scope.
 */
async function resolveScope(
  userId: string,
  scopeParam: string
): Promise<
  | { type: 'household'; householdId: string }
  | { type: 'user'; userId: string }
  | null
> {
  if (scopeParam === 'personal') return { type: 'user', userId };

  // Validate ownership
  const isOwner = await prisma.household.findFirst({
    where: { id: scopeParam, ownerId: userId },
    select: { id: true },
  });
  if (isOwner) return { type: 'household', householdId: scopeParam };

  // Validate membership
  const isMember = await prisma.householdMember.findFirst({
    where: { userId, householdId: scopeParam },
    select: { householdId: true },
  });
  if (isMember) return { type: 'household', householdId: scopeParam };

  return null; // access denied
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const scopeParam = searchParams.get('scope') ?? 'personal';

  const scope = await resolveScope(session.user.id, scopeParam);
  if (!scope) return NextResponse.json({ error: 'Access denied to this scope' }, { status: 403 });

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

  const { searchParams } = new URL(req.url);
  const scopeParam = searchParams.get('scope') ?? 'personal';

  const scope = await resolveScope(session.user.id, scopeParam);
  if (!scope) return NextResponse.json({ error: 'Access denied to this scope' }, { status: 403 });

  const plan: WeekPlan = await req.json();
  const { weekStart, ...rest } = plan;

  if (scope.type === 'household') {
    await prisma.weekPlan.upsert({
      where: { householdId_weekStart: { householdId: scope.householdId, weekStart } },
      update: { data: rest as object },
      create: { householdId: scope.householdId, weekStart, data: rest as object },
    });
  } else {
    await prisma.weekPlan.upsert({
      where: { userId_weekStart: { userId: scope.userId, weekStart } },
      update: { data: rest as object },
      create: { userId: scope.userId, weekStart, data: rest as object },
    });
  }

  return NextResponse.json({ ok: true });
}
