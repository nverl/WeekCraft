'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Extra, ExtraCategory, Ingredient } from '@/app/types';
import seedData from '@/data/extras.json';

const SEED_EXTRAS = seedData as Extra[];
const SEED_IDS = new Set(SEED_EXTRAS.map((e) => e.id));

interface ExtrasStore {
  /** All available extras — seed (possibly user-edited) + user-created. */
  extras: Extra[];

  /** Add a brand-new custom extra. */
  addExtra: (data: { name: string; emoji: string; category: ExtraCategory; ingredients?: Ingredient[] }) => void;
  /** Update name/emoji/category/ingredients for any extra. Marks it isCustom so edits survive reloads. */
  updateExtra: (id: string, data: Partial<Omit<Extra, 'id'>>) => void;
  /** Remove an extra by ID. */
  removeExtra: (id: string) => void;
}

export const useExtrasStore = create<ExtrasStore>()(
  persist(
    (set) => ({
      extras: SEED_EXTRAS,

      addExtra: ({ name, emoji, category, ingredients = [] }) =>
        set((state) => ({
          extras: [
            ...state.extras,
            {
              id: `custom-${Date.now()}`,
              name,
              emoji,
              category,
              ingredients,
              isCustom: true,
            },
          ],
        })),

      updateExtra: (id, data) =>
        set((state) => ({
          extras: state.extras.map((e) =>
            e.id === id ? { ...e, ...data, isCustom: true } : e
          ),
        })),

      removeExtra: (id) =>
        set((state) => ({
          extras: state.extras.filter((e) => e.id !== id),
        })),
    }),
    {
      // v2: bumps key so everyone picks up fresh seed data (isStaple fix)
      name: 'kitchenflow-extras-v2',

      merge: (persisted, current) => {
        const p = persisted as ExtrasStore;
        const persistedExtras: Extra[] = p.extras ?? [];

        // Build a map of persisted extras by id
        const persistedById = new Map(persistedExtras.map((e) => [e.id, e]));

        // For each seed extra: use the user's edited version if they modified it (isCustom),
        // otherwise always use fresh seed data (picks up isStaple fixes, etc.)
        const resolvedSeeds = SEED_EXTRAS.map((seed) => {
          const saved = persistedById.get(seed.id);
          return saved?.isCustom ? saved : seed;
        });

        // Also keep any user-created extras (custom IDs not in seed)
        const userCreated = persistedExtras.filter((e) => e.isCustom && !SEED_IDS.has(e.id));

        return {
          ...current,
          extras: [...resolvedSeeds, ...userCreated],
        };
      },
    }
  )
);
