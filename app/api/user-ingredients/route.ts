import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { IngredientEntry } from '@/app/types';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await prisma.userIngredient.findMany({ where: { userId: session.user.id } });
  const ingredients: IngredientEntry[] = rows.map((r) => ({
    id: r.id, name: r.name, defaultUnit: r.defaultUnit, aisle: r.aisle, isCustom: true,
  }));
  return NextResponse.json(ingredients);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: IngredientEntry = await req.json();
  await prisma.userIngredient.create({
    data: { id: body.id, userId: session.user.id, name: body.name, defaultUnit: body.defaultUnit, aisle: body.aisle },
  });
  return NextResponse.json({ ok: true });
}
