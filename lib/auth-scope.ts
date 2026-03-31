import { prisma } from '@/lib/prisma';

export type ScopeResult =
  | { type: 'household'; householdId: string }
  | { type: 'user'; userId: string }
  | null;

/**
 * Resolve the plan scope from a ?scope= query parameter.
 *  - 'personal'     → user's own plans
 *  - <householdId>  → household plans (user must be owner or member)
 * Returns null if the user does not have access to the requested scope.
 */
export async function resolveScope(userId: string, scopeParam: string): Promise<ScopeResult> {
  if (scopeParam === 'personal') return { type: 'user', userId };

  const isOwner = await prisma.household.findFirst({
    where: { id: scopeParam, ownerId: userId },
    select: { id: true },
  });
  if (isOwner) return { type: 'household', householdId: scopeParam };

  const isMember = await prisma.householdMember.findFirst({
    where: { userId, householdId: scopeParam },
    select: { householdId: true },
  });
  if (isMember) return { type: 'household', householdId: scopeParam };

  return null;
}
