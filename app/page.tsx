import { promises as fs } from 'fs';
import path from 'path';
import type { Recipe } from '@/app/types';
import HomeClient from '@/app/HomeClient';

export default async function Home() {
  const filePath = path.join(process.cwd(), 'data', 'recipes.json');
  const raw = await fs.readFile(filePath, 'utf-8');
  const recipes: Recipe[] = JSON.parse(raw);

  return <HomeClient seedRecipes={recipes} />;
}
