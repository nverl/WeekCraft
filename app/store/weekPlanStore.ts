'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WeekPlan } from '@/app/types';

interface WeekPlanStore {
  /** All saved week plans, keyed by weekStart ISO string (Monday). */
  weeks: Record<string, WeekPlan>;

  /** Which week is currently open in WeekDetailView (ISO string or null = month view). */
  activeWeekStart: string | null;

  /** Whether the wizard is currently open as a full-page overlay. */
  wizardOpen: boolean;

  /** Which week the wizard is planning for (null = next Monday default). */
  wizardTargetWeek: string | null;

  /** Week starts selected to include in the shopping list. */
  selectedWeeksForShopping: string[];

  // ── Actions ──────────────────────────────────────────────────────────────
  saveWeek: (plan: WeekPlan) => void;
  deleteWeek: (weekStart: string) => void;

  setActiveWeek: (weekStart: string | null) => void;

  /** Open the wizard, optionally targeting a specific week. */
  openWizardForWeek: (weekStart: string | null) => void;
  /** Close the wizard and clear the target week. */
  closeWizard: () => void;

  toggleWeekForShopping: (weekStart: string) => void;
  setAllWeeksForShopping: (weekStarts: string[]) => void;

  /** Toggle an extra on/off for a specific saved week. */
  toggleExtraForWeek: (weekStart: string, extraId: string) => void;
}

export const useWeekPlanStore = create<WeekPlanStore>()(
  persist(
    (set, get) => ({
      weeks: {},
      activeWeekStart: null,
      wizardOpen: false,
      wizardTargetWeek: null,
      selectedWeeksForShopping: [],

      saveWeek: (plan) =>
        set((state) => ({
          weeks: { ...state.weeks, [plan.weekStart]: plan },
        })),

      deleteWeek: (weekStart) =>
        set((state) => {
          const weeks = { ...state.weeks };
          delete weeks[weekStart];
          return {
            weeks,
            // Also deselect from shopping if it was selected
            selectedWeeksForShopping: state.selectedWeeksForShopping.filter(
              (w) => w !== weekStart
            ),
            // If this was the active week, close detail view
            activeWeekStart: state.activeWeekStart === weekStart ? null : state.activeWeekStart,
          };
        }),

      setActiveWeek: (weekStart) => set({ activeWeekStart: weekStart }),

      openWizardForWeek: (weekStart) =>
        set({ wizardOpen: true, wizardTargetWeek: weekStart }),

      closeWizard: () =>
        set({ wizardOpen: false, wizardTargetWeek: null }),

      toggleWeekForShopping: (weekStart) =>
        set((state) => {
          const selected = state.selectedWeeksForShopping;
          const next = selected.includes(weekStart)
            ? selected.filter((w) => w !== weekStart)
            : [...selected, weekStart];
          return { selectedWeeksForShopping: next };
        }),

      setAllWeeksForShopping: (weekStarts) =>
        set({ selectedWeeksForShopping: weekStarts }),

      toggleExtraForWeek: (weekStart, extraId) =>
        set((state) => {
          const week = state.weeks[weekStart];
          if (!week) return state;
          const current = week.selectedExtras ?? [];
          const next = current.includes(extraId)
            ? current.filter((id) => id !== extraId)
            : [...current, extraId];
          return {
            weeks: { ...state.weeks, [weekStart]: { ...week, selectedExtras: next } },
          };
        }),
    }),
    { name: 'kitchenflow-weekplans' }
  )
);
