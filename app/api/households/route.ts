import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/households
 * Returns all households the caller belongs to: households they own + households they are a member of.
 * Used by DataLoader and the HouseholdSwitcher to populate the scope selector.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user.id;
  const result: { id: string; name: string; role: 'owner' | 'member'; memberCount: number }[] = [];

  // Owned household
  const owned = await prisma.household.findUnique({
    where: { ownerId: userId },
    include: { _count: { select: { members: true } } },
  });
  if (owned) {
    result.push({
      id: owned.id,
      name: owned.name,
      role: 'owner',
      memberCount: owned._count.members + 1, // +1 for the owner themselves
    });
  }

  // All memberships (user can be a member of multiple households)
  const memberships = await prisma.householdMember.findMany({
    where: { userId },
    include: {
      household: {
        include: { _count: { select: { members: true } } },
      },
    },
  });

  for (const m of memberships) {
    result.push({
      id: m.household.id,
      name: m.household.name,
      role: 'member',
      memberCount: m.household._count.members + 1, // +1 for owner
    });
  }

  return NextResponse.json(result);
}
