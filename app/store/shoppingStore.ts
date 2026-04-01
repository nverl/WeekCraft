'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DayPlan, Extra, ShoppingItem } from '@/app/types';

export interface ExtraWithQty { extra: Extra; qty: number }

interface ShoppingStore {
  /** Which week is currently shown in the shopping list. */
  activeShoppingWeek: string | null;
  /**
   * Per-week pantry state: maps weekStart → array of item names that have been
   * checked off. Stored separately from `items` so rebuilds never lose state.
   */
  pantryByWeek: Record<string, string[]>;
  /** Current week's shopping items (inPantry reflects pantryByWeek). */
  items: ShoppingItem[];
  showStaples: boolean;

  /** Switch to a week and rebuild the item list. */
  buildForWeek: (weekStart: string, plan: DayPlan[], extras: ExtraWithQty[]) => void;
  /** Toggle a single item's pantry/checked state. */
  togglePantry: (name: string) => void;
  toggleShowStaples: () => void;
  clearList: () => void;
}

/** Build a flat shopping list for a single week plan + extras. */
function buildWeekShoppingList(plan: DayPlan[], extras: ExtraWithQty[]): ShoppingItem[] {
  const itemMap = new Map<string, ShoppingItem>();

  // ── Recipe ingredients ──────────────────────────────────────────────────
  for (const dayPlan of plan) {
    if (!dayPlan.recipe) continue;
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

  // ── Extras ingredients ─────────────────────────────────────────────────
  for (const { extra, qty } of extras) {
    for (const ing of extra.ingredients) {
      const scaledAmt = Math.round(ing.amount * qty * 100) / 100;
      const key = `${ing.name}__${ing.unit}__${ing.aisle}`;
      const existing = itemMap.get(key);
      if (existing) {
        existing.scaledAmount = Math.round((existing.scaledAmount + scaledAmt) * 100) / 100;
      } else {
        itemMap.set(key, {
          ...ing,
          recipeId: extra.id,
          recipeName: extra.name,
          scaledAmount: scaledAmt,
          inPantry: false,
        });
      }
    }
  }

  return Array.from(itemMap.values()).sort((a, b) => a.aisle.localeCompare(b.aisle));
}

export const useShoppingStore = create<ShoppingStore>()(
  persist(
    (set, get) => ({
      activeShoppingWeek: null,
      pantryByWeek: {},
      items: [],
      showStaples: false,

      buildForWeek: (weekStart, plan, extras) => {
        const checked = new Set(get().pantryByWeek[weekStart] ?? []);
        const fresh = buildWeekShoppingList(plan, extras);
        set({
          activeShoppingWeek: weekStart,
          items: fresh.map((item) => ({ ...item, inPantry: checked.has(item.name) })),
        });
      },

      togglePantry: (name) =>
        set((state) => {
          const week = state.activeShoppingWeek;
          if (!week) return state;

          const current = state.pantryByWeek[week] ?? [];
          const wasChecked = current.includes(name);
          const nextChecked = wasChecked
            ? current.filter((n) => n !== name)
            : [...current, name];

          return {
            pantryByWeek: { ...state.pantryByWeek, [week]: nextChecked },
            items: state.items.map((item) =>
              item.name === name ? { ...item, inPantry: !wasChecked } : item
            ),
          };
        }),

      toggleShowStaples: () =>
        set((state) => ({ showStaples: !state.showStaples })),

      clearList: () => set({ items: [], activeShoppingWeek: null }),
    }),
    {
      name: 'kitchenflow-shopping-v2',
      // Only persist the pantry state and UI prefs — items are rebuilt from plan data
      partialize: (state) => ({
        activeShoppingWeek: state.activeShoppingWeek,
        pantryByWeek: state.pantryByWeek,
        showStaples: state.showStaples,
      }),
    }
  )
);
