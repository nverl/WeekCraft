import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await prisma.recipeFavourite.findMany({ where: { userId: session.user.id } });
  return NextResponse.json(rows.map((r) => r.recipeId));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { recipeId } = await req.json();
  const exists = await prisma.recipeFavourite.findUnique({
    where: { userId_recipeId: { userId: session.user.id, recipeId } },
  });

  if (exists) {
    await prisma.recipeFavourite.delete({
      where: { userId_recipeId: { userId: session.user.id, recipeId } },
    });
  } else {
    await prisma.recipeFavourite.create({ data: { userId: session.user.id, recipeId } });
  }
  return NextResponse.json({ ok: true });
}
