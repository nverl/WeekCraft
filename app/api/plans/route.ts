import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { WeekPlan } from '@/app/types';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const plans = await prisma.weekPlan.findMany({ where: { userId: session.user.id } });
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

  await prisma.weekPlan.upsert({
    where: { userId_weekStart: { userId: session.user.id, weekStart } },
    update: { data: rest as object },
    create: { userId: session.user.id, weekStart, data: rest as object },
  });

  return NextResponse.json({ ok: true });
}
