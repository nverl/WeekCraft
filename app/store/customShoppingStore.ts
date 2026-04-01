'use client';

import { create } from 'zustand';
import type { CustomShoppingItem } from '@/app/types';

interface CustomShoppingStore {
  items: CustomShoppingItem[];
  loadedWeek: string | null;  // which week the current items belong to
  loading: boolean;

  /** Load items for a specific week and scope. */
  loadItems: (scope: string, weekStart: string) => Promise<void>;
  /** Add an item — no-op if name already exists for this week (case-insensitive). */
  addItem: (name: string, scope: string, weekStart: string) => Promise<CustomShoppingItem | null>;
  /** Toggle inCart state. */
  toggleItem: (id: string, inCart: boolean, scope: string) => Promise<void>;
  /** Remove an item. */
  removeItem: (id: string, scope: string) => Promise<void>;
  /** Clear items (called when switching weeks or scope). */
  clearItems: () => void;
}

function url(scope: string, weekStart?: string) {
  const params = new URLSearchParams({ scope });
  if (weekStart) params.set('weekStart', weekStart);
  return `/api/shopping/custom?${params}`;
}

export const useCustomShoppingStore = create<CustomShoppingStore>((set, get) => ({
  items: [],
  loadedWeek: null,
  loading: false,

  loadItems: async (scope, weekStart) => {
    set({ loading: true });
    try {
      const res = await fetch(url(scope, weekStart));
      if (res.ok) {
        const items: CustomShoppingItem[] = await res.json();
        set({ items, loadedWeek: weekStart });
      }
    } finally {
      set({ loading: false });
    }
  },

  addItem: async (name, scope, weekStart) => {
    const nameLower = name.trim().toLowerCase();
    const exists = get().items.find((i) => i.name.toLowerCase() === nameLower);
    if (exists) return exists;

    const res = await fetch(url(scope, weekStart), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    });
    if (!res.ok) return null;
    const item: CustomShoppingItem = await res.json();
    set((state) => ({
      items: state.items.find((i) => i.id === item.id)
        ? state.items
        : [...state.items, item],
    }));
    return item;
  },

  toggleItem: async (id, inCart, scope) => {
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, inCart } : i)),
    }));
    await fetch(url(scope), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, inCart }),
    });
  },

  removeItem: async (id, scope) => {
    set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
    await fetch(url(scope), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
  },

  clearItems: () => set({ items: [], loadedWeek: null }),
}));
