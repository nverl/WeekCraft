import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { resolveScope } from '@/lib/auth-scope';
import type { WeekPlan } from '@/app/types';

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
