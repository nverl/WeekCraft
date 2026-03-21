'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DayPlan, Extra, ShoppingItem } from '@/app/types';

interface ShoppingStore {
  items: ShoppingItem[];
  showStaples: boolean;
  buildList: (plan: DayPlan[]) => void;
  rebuildList: (plan: DayPlan[]) => void;                              // rebuilds but preserves inPantry state
  rebuildMultiList: (plans: DayPlan[][], extras?: Extra[]) => void;   // multi-week: aggregates all plans + extras
  togglePantry: (name: string) => void;
  toggleShowStaples: () => void;
  clearList: () => void;
}

/** Aggregate ingredients across multiple plans and optional extras (for multi-week shopping). */
function buildMultiShoppingList(plans: DayPlan[][], extras: Extra[] = []): ShoppingItem[] {
  const itemMap = new Map<string, ShoppingItem>();

  // ── Recipe ingredients ───────────────────────────────────────────────────
  for (const plan of plans) {
    for (const dayPlan of plan) {
      if (!dayPlan.recipe) continue; // Skip free / none days
      for (const ing of dayPlan.scaledIngredients) {
        const key = `${ing.name}__${ing.unit}__${ing.aisle}`;
        const existing = itemMap.get(key);
        if (existing) {
          existing.scaledAmount = Math.round((existing.scaledAmount + ing.amount) * 100) / 100;
        } else {
          itemMap.set(key, {
            ...ing,
            recipeId: dayPlan.recipe.id,
            recipeName: dayPlan.recipe.name,
            scaledAmount: ing.amount,
            inPantry: false,
          });
        }
      }
    }
  }

  // ── Extras ingredients ───────────────────────────────────────────────────
  for (const extra of extras) {
    for (const ing of extra.ingredients) {
      const key = `${ing.name}__${ing.unit}__${ing.aisle}`;
      const existing = itemMap.get(key);
      if (existing) {
        existing.scaledAmount = Math.round((existing.scaledAmount + ing.amount) * 100) / 100;
      } else {
        itemMap.set(key, {
          ...ing,
          recipeId: extra.id,
          recipeName: extra.name,
          scaledAmount: ing.amount,
          inPantry: false,
        });
      }
    }
  }

  return Array.from(itemMap.values()).sort((a, b) => a.aisle.localeCompare(b.aisle));
}

function buildShoppingList(plan: DayPlan[]): ShoppingItem[] {
  return buildMultiShoppingList([plan]);
}

export const useShoppingStore = create<ShoppingStore>()(
  persist(
    (set, get) => ({
      items: [],
      showStaples: false,

      buildList: (plan) =>
        set({ items: buildShoppingList(plan) }),

      // Rebuilds from the new plan while preserving which items are in pantry
      rebuildList: (plan) => {
        const pantryMap = new Map(get().items.map((i) => [i.name, i.inPantry]));
        const fresh = buildShoppingList(plan);
        set({
          items: fresh.map((item) => ({
            ...item,
            inPantry: pantryMap.get(item.name) ?? false,
          })),
        });
      },

      // Rebuilds from multiple week plans (+ extras) while preserving pantry state
      rebuildMultiList: (plans, extras = []) => {
        const pantryMap = new Map(get().items.map((i) => [i.name, i.inPantry]));
        const fresh = buildMultiShoppingList(plans, extras);
        set({
          items: fresh.map((item) => ({
            ...item,
            inPantry: pantryMap.get(item.name) ?? false,
          })),
        });
      },

      togglePantry: (name) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.name === name ? { ...item, inPantry: !item.inPantry } : item
          ),
        })),

      toggleShowStaples: () =>
        set((state) => ({ showStaples: !state.showStaples })),

      clearList: () => set({ items: [] }),
    }),
    {
      name: 'kitchenflow-shopping',
    }
  )
);
