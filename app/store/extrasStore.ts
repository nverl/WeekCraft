'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Extra, ExtraCategory, Ingredient } from '@/app/types';
import seedData from '@/data/extras.json';
import { useToastStore } from '@/app/store/toastStore';

const SEED_EXTRAS = seedData as Extra[];
const SEED_IDS = new Set(SEED_EXTRAS.map((e) => e.id));

function toastError(msg: string) {
  useToastStore.getState().addToast(msg, 'error');
}

interface ExtrasStore {
  extras: Extra[];
  hiddenExtraIds: string[];
  hydrated: boolean;

  hydrate: (userExtras: Extra[]) => void;
  addExtra: (data: { name: string; emoji: string; category: ExtraCategory; ingredients?: Ingredient[] }) => void;
  updateExtra: (id: string, data: Partial<Omit<Extra, 'id'>>) => void;
  removeExtra: (id: string) => void;
  toggleExtraHidden: (id: string) => void;
}

export const useExtrasStore = create<ExtrasStore>()(
  persist(
  (set, get) => ({
  extras: SEED_EXTRAS,
  hiddenExtraIds: [],
  hydrated: false,

  hydrate: (userExtras) => {
    const userById = new Map(userExtras.map((e) => [e.id, e]));
    const resolved = SEED_EXTRAS.map((seed) => userById.get(seed.id) ?? seed);
    const custom = userExtras.filter((e) => !SEED_IDS.has(e.id));
    set({ extras: [...resolved, ...custom], hydrated: true });
  },

  addExtra: ({ name, emoji, category, ingredients = [] }) => {
    const extra: Extra = {
      id: `custom-extra-${crypto.randomUUID()}`,
      name, emoji, category, ingredients, isCustom: true,
    };
    set((state) => ({ extras: [...state.extras, extra] }));
    fetch('/api/user-extras', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(extra),
    }).catch(() => toastError('Failed to save extra. Check your connection.'));
  },

  updateExtra: (id, data) => {
    set((state) => ({
      extras: state.extras.map((e) => e.id === id ? { ...e, ...data, isCustom: true } : e),
    }));
    const updated = get().extras.find((e) => e.id === id);
    if (updated) {
      fetch(`/api/user-extras/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updated, ...data, isCustom: true }),
      }).catch(() => toastError('Failed to update extra. Check your connection.'));
    }
  },

  removeExtra: (id) => {
    set((state) => ({
      extras: state.extras.filter((e) => e.id !== id),
      hiddenExtraIds: state.hiddenExtraIds.filter((hid) => hid !== id),
    }));
    fetch(`/api/user-extras/${id}`, { method: 'DELETE' })
      .catch(() => toastError('Failed to delete extra. Check your connection.'));
  },

  toggleExtraHidden: (id) => {
    set((state) => ({
      hiddenExtraIds: state.hiddenExtraIds.includes(id)
        ? state.hiddenExtraIds.filter((hid) => hid !== id)
        : [...state.hiddenExtraIds, id],
    }));
  },
  }),
  {
    name: 'weekcraft-extras-v1',
    partialize: (state) => ({ hiddenExtraIds: state.hiddenExtraIds }),
  }
));
