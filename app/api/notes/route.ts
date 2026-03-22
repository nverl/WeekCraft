import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await prisma.recipeNote.findMany({ where: { userId: session.user.id } });
  const notes: Record<string, string> = {};
  rows.forEach((r) => { notes[r.recipeId] = r.note; });
  return NextResponse.json(notes);
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { recipeId, note } = await req.json();

  if (!note || !note.trim()) {
    await prisma.recipeNote.deleteMany({ where: { userId: session.user.id, recipeId } });
  } else {
    await prisma.recipeNote.upsert({
      where: { userId_recipeId: { userId: session.user.id, recipeId } },
      update: { note: note.trim() },
      create: { userId: session.user.id, recipeId, note: note.trim() },
    });
  }
  return NextResponse.json({ ok: true });
}
