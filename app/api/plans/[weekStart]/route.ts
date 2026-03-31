import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { resolveScope } from '@/lib/auth-scope';

export async function DELETE(req: Request, { params }: { params: Promise<{ weekStart: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { weekStart } = await params;
  const decoded = decodeURIComponent(weekStart);

  const { searchParams } = new URL(req.url);
  const scopeParam = searchParams.get('scope') ?? 'personal';

  const scope = await resolveScope(session.user.id, scopeParam);
  if (!scope) return NextResponse.json({ error: 'Access denied to this scope' }, { status: 403 });

  await prisma.weekPlan.deleteMany({
    where: scope.type === 'household'
      ? { householdId: scope.householdId, weekStart: decoded }
      : { userId: scope.userId, weekStart: decoded },
  });

  return NextResponse.json({ ok: true });
}
