'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DayLabel, DayConfig, DayPlan, Recipe, Ingredient, WizardState, SelectedExtra } from '@/app/types';
import { parseISOToMins, parseISODuration, getNextMonday } from '@/app/lib/weekUtils';

// Re-export for any files that import parseISODuration from this module
export { parseISODuration };

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const DEFAULT_CONFIGS: DayConfig[] = [
  { label: 'healthy',  maxPrepMins: null, maxCalories: null, freeNote: '', freeCalories: null },
  { label: 'healthy',  maxPrepMins: null, maxCalories: null, freeNote: '', freeCalories: null },
  { label: 'low-carb', maxPrepMins: null, maxCalories: null, freeNote: '', freeCalories: null },
  { label: 'healthy',  maxPrepMins: null, maxCalories: null, freeNote: '', freeCalories: null },
  { label: 'low-carb', maxPrepMins: null, maxCalories: null, freeNote: '', freeCalories: null },
  { label: 'cheat',    maxPrepMins: null, maxCalories: null, freeNote: '', freeCalories: null },
  { label: 'cheat',    maxPrepMins: null, maxCalories: null, freeNote: '', freeCalories: null },
];

function scaleIngredients(ingredients: Ingredient[], people: number, recipeYield: number): Ingredient[] {
  const scale = people / recipeYield;
  return ingredients.map((ing) => ({
    ...ing,
    amount: Math.round(ing.amount * scale * 100) / 100,
  }));
}

function generatePlan(
  recipes: Recipe[],
  dayConfigs: DayConfig[],
  people: number,
  days: number,
  targetWeekStart: string | null,
): DayPlan[] {
  const monday = targetWeekStart ? new Date(targetWeekStart) : getNextMonday();
  const plan: DayPlan[] = [];

  for (let i = 0; i < days; i++) {
    const config = dayConfigs[i] ?? DEFAULT_CONFIGS[i % 7];
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);

    // Free / none day — no recipe
    if (config.label === 'none') {
      plan.push({
        day: DAYS_OF_WEEK[i] ?? `Day ${i + 1}`,
        date: date.toISOString(),
        label: 'none',
        recipe: null,
        scaledIngredients: [],
        freeNote: config.freeNote,
        freeCalories: config.freeCalories,
      });
      continue;
    }

    const label = config.label;

    // 'any' = no label filter — draw from all recipes randomly
    // Otherwise filter by matching label
    let pool = label === 'any'
      ? [...recipes]
      : recipes.filter((r) => r.labels.includes(label as DayLabel));

    // Apply per-day maxPrepMins filter (fall back if it empties pool)
    if (config.maxPrepMins !== null) {
      const filtered = pool.filter((r) => parseISOToMins(r.prepTimeISO) <= config.maxPrepMins!);
      if (filtered.length > 0) pool = filtered;
    }

    // Apply per-day maxCalories filter (fall back if it empties pool)
    if (config.maxCalories !== null) {
      const filtered = pool.filter((r) => r.caloriesPerPerson <= config.maxCalories!);
      if (filtered.length > 0) pool = filtered;
    }

    if (pool.length === 0) continue;

    // Avoid repeating the same recipe across recipe days if possible
    const usedIds = plan.filter((p) => p.recipe).map((p) => p.recipe!.id);
    const unused = pool.filter((r) => !usedIds.includes(r.id));
    const candidates = unused.length > 0 ? unused : pool;

    // Deterministic pick (rotate through candidates)
    const recipe = candidates[i % candidates.length];

    const effectivePeople = config.people ?? people;
    plan.push({
      day: DAYS_OF_WEEK[i] ?? `Day ${i + 1}`,
      date: date.toISOString(),
      label,
      recipe,
      people: config.people,   // store per-day override (undefined = use week default)
      scaledIngredients: scaleIngredients(recipe.ingredients, effectivePeople, recipe.recipeYield),
    });
  }

  return plan;
}

// ─── Store Interface ─────────────────────────────────────────────────────────

interface WizardStore extends WizardState {
  // Configuration
  setDayConfig: (index: number, partial: Partial<DayConfig>) => void;
  setPeople: (n: number) => void;
  setDays: (n: number) => void;
  setStep: (step: 1 | 2 | 3) => void;
  setTargetWeekStart: (weekStart: string | null) => void;
  setPlan: (days: DayPlan[]) => void;
  // Extras (qty-based: 0 = deselected)
  setWizardExtraQty: (extraId: string, qty: number) => void;
  // Plan lifecycle
  confirmPlan: (recipes: Recipe[]) => void;
  resetWizard: () => void;
  // In-calendar plan editing
  swapRecipe: (dayIndex: number, recipes: Recipe[]) => void;
  markAsFreeDay: (dayIndex: number, note: string, calories: number | null) => void;
  assignRecipeToDay: (dayIndex: number, recipe: Recipe, label: DayLabel) => void;
  setDayPeople: (dayIndex: number, people: number) => void;
}

const initialState: WizardState = {
  dayConfigs: DEFAULT_CONFIGS.map((c) => ({ ...c })),
  people: 2,
  days: 7,
  plan: [],
  currentStep: 1,
  targetWeekStart: null,
  selectedExtras: [] as SelectedExtra[],
};

export const useWizardStore = create<WizardStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setDayConfig: (index, partial) =>
        set((state) => {
          const dayConfigs = [...state.dayConfigs];
          dayConfigs[index] = { ...dayConfigs[index], ...partial };
          return { dayConfigs };
        }),

      setPeople: (people) => set({ people }),

      setDays: (days) => set({ days }),

      setStep: (currentStep) => set({ currentStep }),

      setTargetWeekStart: (targetWeekStart) => set({ targetWeekStart }),

      setPlan: (plan) => set({ plan }),

      setWizardExtraQty: (extraId, qty) =>
        set((state) => {
          if (qty <= 0) {
            return { selectedExtras: state.selectedExtras.filter((e) => e.id !== extraId) };
          }
          const exists = state.selectedExtras.find((e) => e.id === extraId);
          if (exists) {
            return { selectedExtras: state.selectedExtras.map((e) => e.id === extraId ? { ...e, qty } : e) };
          }
          return { selectedExtras: [...state.selectedExtras, { id: extraId, qty }] };
        }),

      confirmPlan: (recipes) => {
        const { dayConfigs, people, days, targetWeekStart } = get();
        // Only use enabled recipes (enabled===false is explicitly disabled)
        const enabledRecipes = recipes.filter((r) => r.enabled !== false);
        const plan = generatePlan(enabledRecipes, dayConfigs, people, days, targetWeekStart);
        console.log('[WeekCraft] Generated plan:', plan);
        set({ plan, currentStep: 3 });
      },

      resetWizard: () => set((state) => ({ ...initialState, people: state.people })),

      swapRecipe: (dayIndex, recipes) => {
        set((state) => {
          const plan = [...state.plan];
          const current = plan[dayIndex];
          if (!current || current.label === 'none' || !current.recipe) return state;

          // Disabled recipes can still be chosen when swapping (user explicitly picks them)
          const matching = recipes.filter(
            (r) => r.labels.includes(current.label as DayLabel) && r.id !== current.recipe!.id
          );
          if (matching.length === 0) return state;

          const next = matching[Math.floor(Math.random() * matching.length)];
          plan[dayIndex] = {
            ...current,
            recipe: next,
            scaledIngredients: scaleIngredients(next.ingredients, state.people, next.recipeYield),
          };
          return { plan };
        });
      },

      markAsFreeDay: (dayIndex, note, calories) => {
        set((state) => {
          const plan = [...state.plan];
          const current = plan[dayIndex];
          if (!current) return state;
          plan[dayIndex] = {
            ...current,
            label: 'none',
            recipe: null,
            scaledIngredients: [],
            freeNote: note,
            freeCalories: calories,
          };
          return { plan };
        });
      },

      assignRecipeToDay: (dayIndex, recipe, label) => {
        set((state) => {
          const plan = [...state.plan];
          const current = plan[dayIndex];
          if (!current) return state;
          const effectivePeople = current.people ?? state.people;
          plan[dayIndex] = {
            ...current,
            label,
            recipe,
            scaledIngredients: scaleIngredients(recipe.ingredients, effectivePeople, recipe.recipeYield),
            freeNote: undefined,
            freeCalories: undefined,
          };
          return { plan };
        });
      },

      setDayPeople: (dayIndex, people) => {
        set((state) => {
          const plan = [...state.plan];
          const current = plan[dayIndex];
          if (!current || !current.recipe) return state;
          plan[dayIndex] = {
            ...current,
            people,
            scaledIngredients: scaleIngredients(current.recipe.ingredients, people, current.recipe.recipeYield),
          };
          return { plan };
        });
      },
    }),
    {
      name: 'weekcraft-wizard-v3', // bumped: selectedExtras now {id,qty}[], added high-protein/any
    }
  )
);
