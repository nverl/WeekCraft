'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { IngredientEntry } from '@/app/types';
import seedData from '@/data/ingredients.json';

const SEED_INGREDIENTS = seedData as IngredientEntry[];
const SEED_IDS = new Set(SEED_INGREDIENTS.map((e) => e.id));

interface IngredientStore {
  ingredients: IngredientEntry[];
  addIngredient: (data: Omit<IngredientEntry, 'id' | 'isCustom'>) => void;
  updateIngredient: (id: string, data: Partial<Omit<IngredientEntry, 'id'>>) => void;
  removeIngredient: (id: string) => void;
}

export const useIngredientStore = create<IngredientStore>()(
  persist(
    (set) => ({
      ingredients: SEED_INGREDIENTS,

      addIngredient: ({ name, defaultUnit, aisle }) =>
        set((state) => ({
          ingredients: [
            ...state.ingredients,
            {
              id: `custom-ing-${Date.now()}`,
              name,
              defaultUnit,
              aisle,
              isCustom: true,
            },
          ],
        })),

      updateIngredient: (id, data) =>
        set((state) => ({
          ingredients: state.ingredients.map((e) =>
            e.id === id ? { ...e, ...data, isCustom: true } : e
          ),
        })),

      removeIngredient: (id) =>
        set((state) => ({
          ingredients: state.ingredients.filter((e) => e.id !== id),
        })),
    }),
    {
      name: 'kitchenflow-ingredients-v1',

      merge: (persisted, current) => {
        const p = persisted as IngredientStore;
        const persistedIngredients: IngredientEntry[] = p.ingredients ?? [];
        const persistedById = new Map(persistedIngredients.map((e) => [e.id, e]));

        // Always use fresh seed unless the user edited it
        const resolvedSeeds = SEED_INGREDIENTS.map((seed) => {
          const saved = persistedById.get(seed.id);
          return saved?.isCustom ? saved : seed;
        });

        // Keep user-created custom entries (not in seed)
        const userCreated = persistedIngredients.filter(
          (e) => e.isCustom && !SEED_IDS.has(e.id)
        );

        return {
          ...current,
          ingredients: [...resolvedSeeds, ...userCreated],
        };
      },
    }
  )
);
