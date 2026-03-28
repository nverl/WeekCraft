'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface HouseholdInfo {
  id: string;
  name: string;
  role: 'owner' | 'member';
  memberCount: number;
}

interface HouseholdStore {
  /** 'personal' or a householdId string */
  activeScope: string;
  /** All households the user belongs to (owned + member) */
  households: HouseholdInfo[];

  setActiveScope: (scope: string) => void;
  hydrateHouseholds: (households: HouseholdInfo[]) => void;
}

export const useHouseholdStore = create<HouseholdStore>()(
  persist(
    (set) => ({
      activeScope: 'personal',
      households: [],

      setActiveScope: (scope) => set({ activeScope: scope }),

      hydrateHouseholds: (households) =>
        set((state) => {
          // If the stored scope points to a household no longer accessible, reset to 'personal'
          const scopeValid =
            state.activeScope === 'personal' ||
            households.some((h) => h.id === state.activeScope);
          return {
            households,
            activeScope: scopeValid ? state.activeScope : 'personal',
          };
        }),
    }),
    {
      name: 'weekcraft-household-scope',
      // Only persist the active scope choice — household list is re-fetched on load
      partialize: (state) => ({ activeScope: state.activeScope }),
    }
  )
);
