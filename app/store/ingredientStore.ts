'use client';

import { create } from 'zustand';
import type { IngredientEntry } from '@/app/types';
import seedData from '@/data/ingredients.json';
import { useToastStore } from '@/app/store/toastStore';

const SEED_INGREDIENTS = seedData as IngredientEntry[];
const SEED_IDS = new Set(SEED_INGREDIENTS.map((e) => e.id));

function toastError(msg: string) {
  useToastStore.getState().addToast(msg, 'error');
}

interface IngredientStore {
  ingredients: IngredientEntry[];
  hydrated: boolean;

  hydrate: (userIngredients: IngredientEntry[]) => void;
  addIngredient: (data: Omit<IngredientEntry, 'id' | 'isCustom'>) => void;
  updateIngredient: (id: string, data: Partial<Omit<IngredientEntry, 'id'>>) => void;
  removeIngredient: (id: string) => void;
}

export const useIngredientStore = create<IngredientStore>()((set) => ({
  ingredients: SEED_INGREDIENTS,
  hydrated: false,

  hydrate: (userIngredients) => {
    const userById = new Map(userIngredients.map((e) => [e.id, e]));
    const resolved = SEED_INGREDIENTS.map((seed) => userById.get(seed.id) ?? seed);
    const custom = userIngredients.filter((e) => !SEED_IDS.has(e.id));
    set({ ingredients: [...resolved, ...custom], hydrated: true });
  },

  addIngredient: ({ name, defaultUnit, aisle }) => {
    const entry: IngredientEntry = {
      id: `custom-ing-${crypto.randomUUID()}`,
      name, defaultUnit, aisle, isCustom: true,
    };
    set((state) => ({ ingredients: [...state.ingredients, entry] }));
    fetch('/api/user-ingredients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    }).catch(() => toastError('Failed to save ingredient. Check your connection.'));
  },

  updateIngredient: (id, data) => {
    set((state) => ({
      ingredients: state.ingredients.map((e) => e.id === id ? { ...e, ...data, isCustom: true } : e),
    }));
    fetch(`/api/user-ingredients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => toastError('Failed to update ingredient. Check your connection.'));
  },

  removeIngredient: (id) => {
    set((state) => ({ ingredients: state.ingredients.filter((e) => e.id !== id) }));
    fetch(`/api/user-ingredients/${id}`, { method: 'DELETE' })
      .catch(() => toastError('Failed to delete ingredient. Check your connection.'));
  },
}));
