import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { resolveScope } from '@/lib/auth-scope';

function scopeWhere(scope: { type: string; userId?: string; householdId?: string }) {
  return scope.type === 'household'
    ? { householdId: scope.householdId }
    : { userId: scope.userId };
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const scopeParam = searchParams.get('scope') ?? 'personal';
  const weekStart = searchParams.get('weekStart');
  if (!weekStart) return NextResponse.json({ error: 'weekStart required' }, { status: 400 });

  const scope = await resolveScope(session.user.id, scopeParam);
  if (!scope) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  const items = await prisma.shoppingCustomItem.findMany({
    where: { ...scopeWhere(scope), weekStart },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, inCart: true },
  });

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const scopeParam = searchParams.get('scope') ?? 'personal';
  const weekStart = searchParams.get('weekStart');
  if (!weekStart) return NextResponse.json({ error: 'weekStart required' }, { status: 400 });

  const scope = await resolveScope(session.user.id, scopeParam);
  if (!scope) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  // Prevent duplicates (case-insensitive, within same week)
  const existing = await prisma.shoppingCustomItem.findFirst({
    where: {
      ...scopeWhere(scope),
      weekStart,
      name: { equals: name.trim(), mode: 'insensitive' },
    },
  });
  if (existing) return NextResponse.json(existing);

  const item = await prisma.shoppingCustomItem.create({
    data: { ...scopeWhere(scope), weekStart, name: name.trim() },
    select: { id: true, name: true, inCart: true },
  });

  return NextResponse.json(item, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const scopeParam = searchParams.get('scope') ?? 'personal';
  const scope = await resolveScope(session.user.id, scopeParam);
  if (!scope) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  const { id, inCart } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  await prisma.shoppingCustomItem.updateMany({
    where: { id, ...scopeWhere(scope) },
    data: { inCart },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const scopeParam = searchParams.get('scope') ?? 'personal';
  const scope = await resolveScope(session.user.id, scopeParam);
  if (!scope) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  await prisma.shoppingCustomItem.deleteMany({ where: { id, ...scopeWhere(scope) } });

  return NextResponse.json({ ok: true });
}
