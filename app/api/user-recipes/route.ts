import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await prisma.userRecipe.findMany({ where: { userId: session.user.id } });
  const recipes = rows.map(({ userId: _u, createdAt: _c, updatedAt: _upd, ...r }) => ({
    ...r,
    ingredients: r.ingredients as object[],
  }));
  return NextResponse.json(recipes);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const recipe = await prisma.userRecipe.create({
    data: {
      id: body.id,
      userId: session.user.id,
      name: body.name,
      labels: body.labels,
      cuisine: body.cuisine ?? null,
      prepTimeISO: body.prepTimeISO,
      caloriesPerPerson: body.caloriesPerPerson,
      recipeYield: body.recipeYield,
      instructions: body.instructions,
      ingredients: body.ingredients,
      sourceUrl: body.sourceUrl ?? null,
      youtubeUrl: body.youtubeUrl ?? null,
    },
  });
  return NextResponse.json(recipe);
}
