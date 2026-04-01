'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WeekPlan, SelectedExtra } from '@/app/types';
import { normalizeSelectedExtra } from '@/app/lib/weekUtils';
import { useToastStore } from '@/app/store/toastStore';

function toastError(msg: string) {
  useToastStore.getState().addToast(msg, 'error');
}

/** Returns the current active scope from householdStore without creating a React dependency. */
function getActiveScope(): string {
  try {
    // Read directly from localStorage to avoid a cross-store import cycle at module level
    const raw = localStorage.getItem('weekcraft-household-scope');
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed?.state?.activeScope ?? 'personal';
    }
  } catch {
    // localStorage not available (SSR) or parse error
  }
  return 'personal';
}

interface WeekPlanStore {
  weeks: Record<string, WeekPlan>;
  hydrated: boolean;
  activeWeekStart: string | null;
  wizardOpen: boolean;
  wizardTargetWeek: string | null;

  hydrate: (plans: WeekPlan[]) => void;
  resetHydration: () => void;
  saveWeek: (plan: WeekPlan) => void;
  deleteWeek: (weekStart: string) => void;
  setActiveWeek: (weekStart: string | null) => void;
  openWizardForWeek: (weekStart: string | null) => void;
  closeWizard: () => void;
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

      hydrate: (plans) =>
        set({
          weeks: Object.fromEntries(plans.map((p) => [p.weekStart, p])),
          hydrated: true,
        }),

      resetHydration: () => set({ weeks: {}, hydrated: false }),

      saveWeek: (plan) => {
        set((state) => ({ weeks: { ...state.weeks, [plan.weekStart]: plan } }));
        const scope = getActiveScope();
        fetch(`/api/plans?scope=${encodeURIComponent(scope)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(plan),
        }).catch(() => toastError('Failed to save plan. Check your connection.'));
      },

      deleteWeek: (weekStart) => {
        set((state) => {
          const weeks = { ...state.weeks };
          delete weeks[weekStart];
          return {
            weeks,
            activeWeekStart: state.activeWeekStart === weekStart ? null : state.activeWeekStart,
          };
        });
        const scope = getActiveScope();
        fetch(`/api/plans/${encodeURIComponent(weekStart)}?scope=${encodeURIComponent(scope)}`, {
          method: 'DELETE',
        }).catch(() => toastError('Failed to delete plan. Check your connection.'));
      },

      setActiveWeek: (weekStart) => set({ activeWeekStart: weekStart }),
      openWizardForWeek: (weekStart) => set({ wizardOpen: true, wizardTargetWeek: weekStart }),
      closeWizard: () => set({ wizardOpen: false, wizardTargetWeek: null }),

      toggleExtraForWeek: (weekStart, extraId) => {
        set((state) => {
          const week = state.weeks[weekStart];
          if (!week) return state;
          const current: SelectedExtra[] = (week.selectedExtras ?? []).map(normalizeSelectedExtra);
          const exists = current.find((e) => e.id === extraId);
          const next = exists
            ? current.filter((e) => e.id !== extraId)
            : [...current, { id: extraId, qty: 1 }];
          const updated = { ...week, selectedExtras: next };
          const scope = getActiveScope();
          fetch(`/api/plans?scope=${encodeURIComponent(scope)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated),
          }).catch(() => toastError('Failed to update extras. Check your connection.'));
          return { weeks: { ...state.weeks, [weekStart]: updated } };
        });
      },

      setExtraQtyForWeek: (weekStart, extraId, qty) => {
        set((state) => {
          const week = state.weeks[weekStart];
          if (!week) return state;
          const current: SelectedExtra[] = (week.selectedExtras ?? []).map(normalizeSelectedExtra);
          let next: SelectedExtra[];
          if (qty <= 0) {
            next = current.filter((e) => e.id !== extraId);
          } else {
            const exists = current.find((e) => e.id === extraId);
            next = exists
              ? current.map((e) => (e.id === extraId ? { ...e, qty } : e))
              : [...current, { id: extraId, qty }];
          }
          const updated = { ...week, selectedExtras: next };
          const scope = getActiveScope();
          fetch(`/api/plans?scope=${encodeURIComponent(scope)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated),
          }).catch(() => toastError('Failed to update extras. Check your connection.'));
          return { weeks: { ...state.weeks, [weekStart]: updated } };
        });
      },
    }),
    {
      name: 'weekcraft-ui-v1',
      // Only persist UI state — actual plan data comes from the DB
      partialize: (state) => ({
        activeWeekStart: state.activeWeekStart,
      }),
    }
  )
);
