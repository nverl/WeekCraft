import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { isString, isNumber, isStringArray, isISODuration, isSafeUrl, isValidIngredient } from '@/lib/validate';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // ── Input validation ─────────────────────────────────────────────────────
  if (!isString(body.name, 200))
    return NextResponse.json({ error: 'name is required (max 200 chars)' }, { status: 400 });
  if (!isStringArray(body.labels, 10, 50))
    return NextResponse.json({ error: 'labels must be an array of strings' }, { status: 400 });
  if (!isISODuration(body.prepTimeISO))
    return NextResponse.json({ error: 'prepTimeISO must be a valid ISO 8601 duration (e.g. PT30M)' }, { status: 400 });
  if (!isNumber(body.caloriesPerPerson, 0, 9999))
    return NextResponse.json({ error: 'caloriesPerPerson must be 0–9999' }, { status: 400 });
  if (!isNumber(body.recipeYield, 1, 100))
    return NextResponse.json({ error: 'recipeYield must be 1–100' }, { status: 400 });
  if (!isStringArray(body.instructions, 100, 2000))
    return NextResponse.json({ error: 'instructions must be an array of strings' }, { status: 400 });
  if (!Array.isArray(body.ingredients) || !body.ingredients.every(isValidIngredient))
    return NextResponse.json({ error: 'ingredients must be an array of {name, amount, unit}' }, { status: 400 });
  if (body.sourceUrl !== undefined && body.sourceUrl !== null && !isSafeUrl(body.sourceUrl))
    return NextResponse.json({ error: 'sourceUrl must be a valid http/https URL' }, { status: 400 });
  if (body.youtubeUrl !== undefined && body.youtubeUrl !== null && !isSafeUrl(body.youtubeUrl))
    return NextResponse.json({ error: 'youtubeUrl must be a valid http/https URL' }, { status: 400 });

  const { id } = await params;

  // updateMany with userId in where clause enforces ownership
  await prisma.userRecipe.updateMany({
    where: { id, userId: session.user.id },
    data: {
      name: body.name as string,
      labels: body.labels as string[],
      cuisine: typeof body.cuisine === 'string' ? body.cuisine : null,
      prepTimeISO: body.prepTimeISO as string,
      caloriesPerPerson: body.caloriesPerPerson as number,
      recipeYield: body.recipeYield as number,
      instructions: body.instructions as string[],
      ingredients: body.ingredients as object[],
      sourceUrl: typeof body.sourceUrl === 'string' ? body.sourceUrl : null,
      youtubeUrl: typeof body.youtubeUrl === 'string' ? body.youtubeUrl : null,
      ...(typeof body.enabled === 'boolean' ? { enabled: body.enabled } : {}),
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  // deleteMany with userId enforces ownership silently (0 rows deleted on mismatch)
  await prisma.userRecipe.deleteMany({ where: { id, userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
