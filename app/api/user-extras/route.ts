import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { Extra } from '@/app/types';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await prisma.userExtra.findMany({ where: { userId: session.user.id } });
  const extras: Extra[] = rows.map((r) => ({
    id: r.id, name: r.name, emoji: r.emoji,
    category: r.category as Extra['category'],
    ingredients: r.items as unknown as Extra['ingredients'],
    isCustom: true,
  }));
  return NextResponse.json(extras);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: Extra = await req.json();
  await prisma.userExtra.upsert({
    where: { id: body.id },
    update: { name: body.name, emoji: body.emoji, category: body.category, items: (body.ingredients ?? []) as object[] },
    create: {
      id: body.id, userId: session.user.id,
      name: body.name, emoji: body.emoji, category: body.category,
      items: (body.ingredients ?? []) as object[],
    },
  });
  return NextResponse.json({ ok: true });
}
