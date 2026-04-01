'use client';

import { create } from 'zustand';
import type { CustomShoppingItem } from '@/app/types';

interface CustomShoppingStore {
  items: CustomShoppingItem[];
  loading: boolean;

  /** Load items from the server for the given scope. */
  loadItems: (scope: string) => Promise<void>;
  /** Add an item — no-op if name already exists (case-insensitive). Returns the item. */
  addItem: (name: string, scope: string) => Promise<CustomShoppingItem | null>;
  /** Toggle inCart state. */
  toggleItem: (id: string, inCart: boolean, scope: string) => Promise<void>;
  /** Remove an item. */
  removeItem: (id: string, scope: string) => Promise<void>;
  /** Clear all items from store (called on scope switch before reload). */
  clearItems: () => void;
}

export const useCustomShoppingStore = create<CustomShoppingStore>((set, get) => ({
  items: [],
  loading: false,

  loadItems: async (scope) => {
    set({ loading: true });
    try {
      const res = await fetch(`/api/shopping/custom?scope=${encodeURIComponent(scope)}`);
      if (res.ok) {
        const items: CustomShoppingItem[] = await res.json();
        set({ items });
      }
    } finally {
      set({ loading: false });
    }
  },

  addItem: async (name, scope) => {
    // Optimistic duplicate check
    const nameLower = name.trim().toLowerCase();
    const exists = get().items.find((i) => i.name.toLowerCase() === nameLower);
    if (exists) return exists;

    const res = await fetch(`/api/shopping/custom?scope=${encodeURIComponent(scope)}`, {
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
    // Optimistic update
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, inCart } : i)),
    }));
    await fetch(`/api/shopping/custom?scope=${encodeURIComponent(scope)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, inCart }),
    });
  },

  removeItem: async (id, scope) => {
    // Optimistic update
    set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
    await fetch(`/api/shopping/custom?scope=${encodeURIComponent(scope)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
  },

  clearItems: () => set({ items: [] }),
}));
