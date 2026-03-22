import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { Extra } from '@/app/types';
import { isString } from '@/lib/validate';

const VALID_CATEGORIES = new Set(['drink', 'breakfast', 'snack', 'other']);

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

  let body: Partial<Extra>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // ── Input validation ─────────────────────────────────────────────────────
  if (!isString(body.name, 100)) {
    return NextResponse.json({ error: 'name must be a non-empty string (max 100 chars)' }, { status: 400 });
  }
  if (!isString(body.emoji, 10)) {
    return NextResponse.json({ error: 'emoji is required' }, { status: 400 });
  }
  if (!body.category || !VALID_CATEGORIES.has(body.category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
  }

  // ── Ownership guard: block upsert onto another user's extra ──────────────
  if (body.id) {
    const existing = await prisma.userExtra.findUnique({ where: { id: body.id } });
    if (existing && existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const id = body.id ?? crypto.randomUUID();

  await prisma.userExtra.upsert({
    where: { id },
    update: {
      name: body.name,
      emoji: body.emoji,
      category: body.category,
      items: (body.ingredients ?? []) as object[],
    },
    create: {
      id,
      userId: session.user.id,
      name: body.name,
      emoji: body.emoji,
      category: body.category,
      items: (body.ingredients ?? []) as object[],
    },
  });
  return NextResponse.json({ ok: true });
}
