'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Recipe } from '@/app/types';

interface RecipeStore {
  customRecipes: Recipe[];
  favouriteIds: string[];
  recipeNotes: Record<string, string>;
  /** Built-in recipe IDs the user has disabled (persisted in localStorage). */
  disabledBuiltinIds: string[];
  hydrated: boolean;

  hydrate: (data: { customRecipes: Recipe[]; favouriteIds: string[]; recipeNotes: Record<string, string> }) => void;
  addRecipe: (recipe: Omit<Recipe, 'id'>) => Recipe;
  updateRecipe: (id: string, recipe: Omit<Recipe, 'id'>) => void;
  deleteRecipe: (id: string) => void;
  toggleFavourite: (id: string) => void;
  setRecipeNote: (id: string, note: string) => void;
  /** Toggle enabled state. For built-ins, updates disabledBuiltinIds. For custom, updates DB. */
  toggleRecipeEnabled: (id: string, isBuiltin: boolean) => void;
}

export const useRecipeStore = create<RecipeStore>()(
  persist(
    (set, get) => ({
      customRecipes: [],
      favouriteIds: [],
      recipeNotes: {},
      disabledBuiltinIds: [],
      hydrated: false,

      hydrate: ({ customRecipes, favouriteIds, recipeNotes }) =>
        set({ customRecipes, favouriteIds, recipeNotes, hydrated: true }),

      addRecipe: (data) => {
        const recipe: Recipe = { ...data, id: `custom-${crypto.randomUUID()}`, enabled: true };
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

      toggleRecipeEnabled: (id, isBuiltin) => {
        if (isBuiltin) {
          set((state) => ({
            disabledBuiltinIds: state.disabledBuiltinIds.includes(id)
              ? state.disabledBuiltinIds.filter((did) => did !== id)
              : [...state.disabledBuiltinIds, id],
          }));
        } else {
          set((state) => ({
            customRecipes: state.customRecipes.map((r) =>
              r.id === id ? { ...r, enabled: !(r.enabled ?? true) } : r
            ),
          }));
          const recipe = get().customRecipes.find((r) => r.id === id);
          if (recipe) {
            fetch(`/api/user-recipes/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...recipe, enabled: !(recipe.enabled ?? true) }),
            }).catch(console.error);
          }
        }
      },
    }),
    {
      name: 'weekcraft-recipes-v1',
      // Only persist the disabled built-in IDs client-side; everything else hydrates from server
      partialize: (state) => ({ disabledBuiltinIds: state.disabledBuiltinIds }),
    }
  )
);
