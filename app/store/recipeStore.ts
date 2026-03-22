'use client';

import { create } from 'zustand';
import type { Recipe } from '@/app/types';

interface RecipeStore {
  customRecipes: Recipe[];
  favouriteIds: string[];
  recipeNotes: Record<string, string>;
  hydrated: boolean;

  hydrate: (data: { customRecipes: Recipe[]; favouriteIds: string[]; recipeNotes: Record<string, string> }) => void;
  addRecipe: (recipe: Omit<Recipe, 'id'>) => Recipe;
  updateRecipe: (id: string, recipe: Omit<Recipe, 'id'>) => void;
  deleteRecipe: (id: string) => void;
  toggleFavourite: (id: string) => void;
  setRecipeNote: (id: string, note: string) => void;
}

export const useRecipeStore = create<RecipeStore>()((set) => ({
  customRecipes: [],
  favouriteIds: [],
  recipeNotes: {},
  hydrated: false,

  hydrate: ({ customRecipes, favouriteIds, recipeNotes }) =>
    set({ customRecipes, favouriteIds, recipeNotes, hydrated: true }),

  addRecipe: (data) => {
    const recipe: Recipe = { ...data, id: `custom-${crypto.randomUUID()}` };
    set((state) => ({ customRecipes: [...state.customRecipes, recipe] }));
    fetch('/api/user-recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recipe),
    }).catch(console.error);
    return recipe;
  },

  updateRecipe: (id, data) => {
    set((state) => ({
      customRecipes: state.customRecipes.map((r) => r.id === id ? { ...data, id } : r),
    }));
    fetch(`/api/user-recipes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, id }),
    }).catch(console.error);
  },

  deleteRecipe: (id) => {
    set((state) => ({
      customRecipes: state.customRecipes.filter((r) => r.id !== id),
      favouriteIds: state.favouriteIds.filter((fid) => fid !== id),
      recipeNotes: Object.fromEntries(
        Object.entries(state.recipeNotes).filter(([k]) => k !== id)
      ),
    }));
    fetch(`/api/user-recipes/${id}`, { method: 'DELETE' }).catch(console.error);
  },

  toggleFavourite: (id) => {
    set((state) => ({
      favouriteIds: state.favouriteIds.includes(id)
        ? state.favouriteIds.filter((fid) => fid !== id)
        : [...state.favouriteIds, id],
    }));
    fetch('/api/favourites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipeId: id }),
    }).catch(console.error);
  },

  setRecipeNote: (id, note) => {
    set((state) => ({
      recipeNotes: note.trim()
        ? { ...state.recipeNotes, [id]: note.trim() }
        : Object.fromEntries(Object.entries(state.recipeNotes).filter(([k]) => k !== id)),
    }));
    fetch('/api/notes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipeId: id, note }),
    }).catch(console.error);
  },
}));
