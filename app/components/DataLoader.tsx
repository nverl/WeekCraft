'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useWeekPlanStore } from '@/app/store/weekPlanStore';
import { useRecipeStore } from '@/app/store/recipeStore';
import { useExtrasStore } from '@/app/store/extrasStore';
import { useIngredientStore } from '@/app/store/ingredientStore';
import { useWizardStore } from '@/app/store/wizardStore';
import type { WeekPlan, Recipe, Extra, IngredientEntry } from '@/app/types';

export default function DataLoader({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const loaded = useRef(false);

  const hydrateWeeks = useWeekPlanStore((s) => s.hydrate);
  const hydrateRecipes = useRecipeStore((s) => s.hydrate);
  const hydrateExtras = useExtrasStore((s) => s.hydrate);
  const hydrateIngredients = useIngredientStore((s) => s.hydrate);
  const setPeople = useWizardStore((s) => s.setPeople);

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id || loaded.current) return;
    loaded.current = true;

    async function load() {
      try {
        const [plansRes, recipesRes, favouritesRes, notesRes, extrasRes, ingredientsRes, accountRes] =
          await Promise.all([
            fetch('/api/plans'),
            fetch('/api/user-recipes'),
            fetch('/api/favourites'),
            fetch('/api/notes'),
            fetch('/api/user-extras'),
            fetch('/api/user-ingredients'),
            fetch('/api/account/me'),
          ]);

        const [plans, customRecipes, favouriteIds, recipeNotes, userExtras, userIngredients, account]: [
          WeekPlan[], Recipe[], string[], Record<string, string>, Extra[], IngredientEntry[], { defaultPeople?: number }
        ] = await Promise.all([
          plansRes.json(),
          recipesRes.json(),
          favouritesRes.json(),
          notesRes.json(),
          extrasRes.json(),
          ingredientsRes.json(),
          accountRes.json(),
        ]);

        hydrateWeeks(plans);
        hydrateRecipes({ customRecipes, favouriteIds, recipeNotes });
        hydrateExtras(userExtras);
        hydrateIngredients(userIngredients);
        if (account?.defaultPeople) setPeople(account.defaultPeople);
      } catch (err) {
        console.error('[DataLoader] Failed to load user data:', err);
        // Hydrate with empty data so app isn't stuck loading
        hydrateWeeks([]);
        hydrateRecipes({ customRecipes: [], favouriteIds: [], recipeNotes: {} });
        hydrateExtras([]);
        hydrateIngredients([]);
      }
    }

    load();
  }, [status, session?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>;
}
