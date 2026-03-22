import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  await prisma.userExtra.upsert({
    where: { id },
    update: { name: body.name, emoji: body.emoji, category: body.category, items: body.ingredients ?? [] },
    create: {
      id, userId: session.user.id,
      name: body.name, emoji: body.emoji, category: body.category,
      items: body.ingredients ?? [],
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await prisma.userExtra.deleteMany({ where: { id, userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
