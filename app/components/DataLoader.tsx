'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useWeekPlanStore } from '@/app/store/weekPlanStore';
import { useRecipeStore } from '@/app/store/recipeStore';
import { useExtrasStore } from '@/app/store/extrasStore';
import { useIngredientStore } from '@/app/store/ingredientStore';
import { useWizardStore } from '@/app/store/wizardStore';
import { useHouseholdStore } from '@/app/store/householdStore';
import { useCustomShoppingStore } from '@/app/store/customShoppingStore';
import type { WeekPlan, Recipe, Extra, IngredientEntry } from '@/app/types';
import type { HouseholdInfo } from '@/app/store/householdStore';

export default function DataLoader({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const loaded = useRef(false);

  const hydrateWeeks = useWeekPlanStore((s) => s.hydrate);
  const resetHydration = useWeekPlanStore((s) => s.resetHydration);
  const hydrateRecipes = useRecipeStore((s) => s.hydrate);
  const hydrateExtras = useExtrasStore((s) => s.hydrate);
  const hydrateIngredients = useIngredientStore((s) => s.hydrate);
  const setPeople = useWizardStore((s) => s.setPeople);
  const { activeScope, hydrateHouseholds, setActiveScope } = useHouseholdStore();
  const { loadItems: loadCustomItems, clearItems: clearCustomItems } = useCustomShoppingStore();

  // ── Initial full load (runs once after authentication) ───────────────────
  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id || loaded.current) return;
    loaded.current = true;

    async function load() {
      try {
        const [plansRes, recipesRes, favouritesRes, notesRes, extrasRes, ingredientsRes, accountRes, householdsRes] =
          await Promise.all([
            fetch(`/api/plans?scope=${encodeURIComponent(activeScope)}`),
            fetch('/api/user-recipes'),
            fetch('/api/favourites'),
            fetch('/api/notes'),
            fetch('/api/user-extras'),
            fetch('/api/user-ingredients'),
            fetch('/api/account/me'),
            fetch('/api/households'),
          ]);

        // Load custom shopping items (fire-and-forget alongside other loads)
        loadCustomItems(activeScope);

        const [plans, customRecipes, favouriteIds, recipeNotes, userExtras, userIngredients, account, households]: [
          WeekPlan[], Recipe[], string[], Record<string, string>, Extra[], IngredientEntry[],
          { defaultPeople?: number }, HouseholdInfo[]
        ] = await Promise.all([
          plansRes.json(),
          recipesRes.json(),
          favouritesRes.json(),
          notesRes.json(),
          extrasRes.json(),
          ingredientsRes.json(),
          accountRes.json(),
          householdsRes.json(),
        ]);

        // Hydrate household list and validate stored scope
        hydrateHouseholds(Array.isArray(households) ? households : []);

        // If stored scope is 'personal' but user has no personal plans and IS in a household,
        // auto-switch to their first household (migration helper for existing users).
        if (activeScope === 'personal' && Array.isArray(plans) && plans.length === 0 && Array.isArray(households) && households.length > 0) {
          setActiveScope(households[0].id);
          // Plans will be re-fetched by the scope-change effect below
          hydrateWeeks([]);
        } else {
          hydrateWeeks(Array.isArray(plans) ? plans : []);
        }

        hydrateRecipes({ customRecipes, favouriteIds, recipeNotes });
        hydrateExtras(userExtras);
        hydrateIngredients(userIngredients);
        if (account?.defaultPeople) setPeople(account.defaultPeople);
      } catch (err) {
        console.error('[DataLoader] Failed to load user data:', err);
        hydrateWeeks([]);
        hydrateRecipes({ customRecipes: [], favouriteIds: [], recipeNotes: {} });
        hydrateExtras([]);
        hydrateIngredients([]);
        hydrateHouseholds([]);
      }
    }

    load();
  }, [status, session?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Re-fetch plans when scope changes (after initial load) ───────────────
  useEffect(() => {
    // Skip if not authenticated or initial load hasn't happened yet
    if (status !== 'authenticated' || !loaded.current) return;

    const controller = new AbortController();

    async function reloadPlans() {
      resetHydration();
      clearCustomItems();
      try {
        const [res] = await Promise.all([
          fetch(`/api/plans?scope=${encodeURIComponent(activeScope)}`, { signal: controller.signal }),
          loadCustomItems(activeScope),
        ]);
        if (!res.ok) {
          hydrateWeeks([]);
          return;
        }
        const plans: WeekPlan[] = await res.json();
        hydrateWeeks(Array.isArray(plans) ? plans : []);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        console.error('[DataLoader] Failed to reload plans:', err);
        hydrateWeeks([]);
      }
    }

    reloadPlans();
    return () => controller.abort();
  }, [activeScope]); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>;
}
