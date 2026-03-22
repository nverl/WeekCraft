'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WeekPlan, SelectedExtra } from '@/app/types';

interface WeekPlanStore {
  weeks: Record<string, WeekPlan>;
  hydrated: boolean;
  activeWeekStart: string | null;
  wizardOpen: boolean;
  wizardTargetWeek: string | null;
  selectedWeeksForShopping: string[];

  hydrate: (plans: WeekPlan[]) => void;
  saveWeek: (plan: WeekPlan) => void;
  deleteWeek: (weekStart: string) => void;
  setActiveWeek: (weekStart: string | null) => void;
  openWizardForWeek: (weekStart: string | null) => void;
  closeWizard: () => void;
  toggleWeekForShopping: (weekStart: string) => void;
  setAllWeeksForShopping: (weekStarts: string[]) => void;
  toggleExtraForWeek: (weekStart: string, extraId: string) => void;
  setExtraQtyForWeek: (weekStart: string, extraId: string, qty: number) => void;
}

export const useWeekPlanStore = create<WeekPlanStore>()(
  persist(
    (set) => ({
      weeks: {},
      hydrated: false,
      activeWeekStart: null,
      wizardOpen: false,
      wizardTargetWeek: null,
      selectedWeeksForShopping: [],

      hydrate: (plans) =>
        set({
          weeks: Object.fromEntries(plans.map((p) => [p.weekStart, p])),
          hydrated: true,
        }),

      saveWeek: (plan) => {
        set((state) => ({ weeks: { ...state.weeks, [plan.weekStart]: plan } }));
        fetch('/api/plans', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(plan),
        }).catch(console.error);
      },

      deleteWeek: (weekStart) => {
        set((state) => {
          const weeks = { ...state.weeks };
          delete weeks[weekStart];
          return {
            weeks,
            selectedWeeksForShopping: state.selectedWeeksForShopping.filter((w) => w !== weekStart),
            activeWeekStart: state.activeWeekStart === weekStart ? null : state.activeWeekStart,
          };
        });
        fetch(`/api/plans/${encodeURIComponent(weekStart)}`, { method: 'DELETE' }).catch(console.error);
      },

      setActiveWeek: (weekStart) => set({ activeWeekStart: weekStart }),
      openWizardForWeek: (weekStart) => set({ wizardOpen: true, wizardTargetWeek: weekStart }),
      closeWizard: () => set({ wizardOpen: false, wizardTargetWeek: null }),

      toggleWeekForShopping: (weekStart) =>
        set((state) => {
          const selected = state.selectedWeeksForShopping;
          const next = selected.includes(weekStart)
            ? selected.filter((w) => w !== weekStart)
            : [...selected, weekStart];
          return { selectedWeeksForShopping: next };
        }),

      setAllWeeksForShopping: (weekStarts) => set({ selectedWeeksForShopping: weekStarts }),

      toggleExtraForWeek: (weekStart, extraId) => {
        set((state) => {
          const week = state.weeks[weekStart];
          if (!week) return state;
          const current: SelectedExtra[] = (week.selectedExtras ?? []).map((e) =>
            typeof e === 'string' ? { id: e, qty: 1 } : e
          );
          const exists = current.find((e) => e.id === extraId);
          const next = exists
            ? current.filter((e) => e.id !== extraId)        // remove
            : [...current, { id: extraId, qty: 1 }];         // add with qty 1
          const updated = { ...week, selectedExtras: next };
          fetch('/api/plans', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated),
          }).catch(console.error);
          return { weeks: { ...state.weeks, [weekStart]: updated } };
        });
      },

      setExtraQtyForWeek: (weekStart, extraId, qty) => {
        set((state) => {
          const week = state.weeks[weekStart];
          if (!week) return state;
          const current: SelectedExtra[] = (week.selectedExtras ?? []).map((e) =>
            typeof e === 'string' ? { id: e, qty: 1 } : e
          );
          let next: SelectedExtra[];
          if (qty <= 0) {
            next = current.filter((e) => e.id !== extraId);
          } else {
            const exists = current.find((e) => e.id === extraId);
            next = exists
              ? current.map((e) => e.id === extraId ? { ...e, qty } : e)
              : [...current, { id: extraId, qty }];
          }
          const updated = { ...week, selectedExtras: next };
          fetch('/api/plans', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated),
          }).catch(console.error);
          return { weeks: { ...state.weeks, [weekStart]: updated } };
        });
      },
    }),
    {
      name: 'weekcraft-ui-v1',
      // Only persist UI state — actual plan data comes from the DB
      partialize: (state) => ({
        activeWeekStart: state.activeWeekStart,
        selectedWeeksForShopping: state.selectedWeeksForShopping,
      }),
    }
  )
);
