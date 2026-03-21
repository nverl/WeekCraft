'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Recipe } from '@/app/types';

interface RecipeStore {
  customRecipes: Recipe[];
  favouriteIds: string[];
  recipeNotes: Record<string, string>;

  addRecipe: (recipe: Omit<Recipe, 'id'>) => Recipe;
  updateRecipe: (id: string, recipe: Omit<Recipe, 'id'>) => void;
  deleteRecipe: (id: string) => void;
  toggleFavourite: (id: string) => void;
  setRecipeNote: (id: string, note: string) => void;
}

export const useRecipeStore = create<RecipeStore>()(
  persist(
    (set) => ({
      customRecipes: [],
      favouriteIds: [],
      recipeNotes: {},

      addRecipe: (data) => {
        const recipe: Recipe = { ...data, id: `custom-${Date.now()}` };
        set((state) => ({ customRecipes: [...state.customRecipes, recipe] }));
        return recipe;
      },

      updateRecipe: (id, data) =>
        set((state) => ({
          customRecipes: state.customRecipes.map((r) =>
            r.id === id ? { ...data, id } : r
          ),
        })),

      deleteRecipe: (id) =>
        set((state) => ({
          customRecipes: state.customRecipes.filter((r) => r.id !== id),
          favouriteIds: state.favouriteIds.filter((fid) => fid !== id),
          recipeNotes: Object.fromEntries(
            Object.entries(state.recipeNotes).filter(([k]) => k !== id)
          ),
        })),

      toggleFavourite: (id) =>
        set((state) => ({
          favouriteIds: state.favouriteIds.includes(id)
            ? state.favouriteIds.filter((fid) => fid !== id)
            : [...state.favouriteIds, id],
        })),

      setRecipeNote: (id, note) =>
        set((state) => ({
          recipeNotes: note.trim()
            ? { ...state.recipeNotes, [id]: note.trim() }
            : Object.fromEntries(Object.entries(state.recipeNotes).filter(([k]) => k !== id)),
        })),
    }),
    { name: 'kitchenflow-recipes' }
  )
);
