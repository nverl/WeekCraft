'use client';

import { CalendarDays, ShoppingCart, Sparkles, BookOpen, Home } from 'lucide-react';
import { useWizardStore } from '@/app/store/wizardStore';
import { useWeekPlanStore } from '@/app/store/weekPlanStore';
import { useRecipeStore } from '@/app/store/recipeStore';
import { getWeekStartISO, getNextMonday } from '@/app/lib/weekUtils';
import WizardContainer from '@/app/components/wizard/WizardContainer';
import HomeView from '@/app/components/home/HomeView';
import MonthCalendar from '@/app/components/calendar/MonthCalendar';
import WeekDetailView from '@/app/components/calendar/WeekDetailView';
import ShoppingList from '@/app/components/shopping/ShoppingList';
import RecipesView from '@/app/components/recipes/RecipesView';
import DataLoader from '@/app/components/DataLoader';
import HouseholdSwitcher from '@/app/components/HouseholdSwitcher';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import type { DayPlan, Recipe } from '@/app/types';

type AppView = 'home' | 'calendar' | 'shopping' | 'recipes';

interface HomeClientProps {
  seedRecipes: Recipe[];
}

const NAV: { id: AppView; label: string; icon: React.ReactNode }[] = [
  { id: 'home',     label: 'Home',     icon: <Home size={20} />        },
  { id: 'calendar', label: 'Calendar', icon: <CalendarDays size={20} /> },
  { id: 'shopping', label: 'Shopping', icon: <ShoppingCart size={20} /> },
  { id: 'recipes',  label: 'Recipes',  icon: <BookOpen size={20} />     },
];

export default function HomeClient({ seedRecipes }: HomeClientProps) {
  const { data: session } = useSession();
  const { dayConfigs, people, selectedExtras, resetWizard } = useWizardStore();
  const {
    weeks, wizardOpen, activeWeekStart, hydrated,
    saveWeek, closeWizard, openWizardForWeek,
    toggleWeekForShopping, selectedWeeksForShopping,
    setActiveWeek,
  } = useWeekPlanStore();
  const { customRecipes, disabledBuiltinIds } = useRecipeStore();
  const [view, setView] = useState<AppView>('home');

  // Merge seed + custom recipes; mark disabled built-ins so plan generation skips them
  const allRecipes: Recipe[] = [
    ...seedRecipes.map((r) => disabledBuiltinIds.includes(r.id) ? { ...r, enabled: false } : r),
    ...customRecipes,
  ];

  const hasPlans = Object.keys(weeks).length > 0;
  const showWizard = wizardOpen || (!hydrated ? false : !hasPlans);

  // ── Wizard complete handler ───────────────────────────────────────────────
  const handleWizardComplete = (plan: DayPlan[], targetWeekStart: string | null) => {
    const effectiveWeekStart = targetWeekStart ?? getWeekStartISO(getNextMonday());

    saveWeek({
      weekStart: effectiveWeekStart,
      dayConfigs: [...dayConfigs],
      people,
      days: plan,
      selectedExtras: [...selectedExtras],
    });

    if (!selectedWeeksForShopping.includes(effectiveWeekStart)) {
      toggleWeekForShopping(effectiveWeekStart);
    }

    closeWizard();
    setView('home');
  };

  const handleWizardCancel = () => closeWizard();

  const handleNewPlan = () => {
    resetWizard();
    openWizardForWeek(null);
  };

  // Show month calendar (from HomeView "All weeks" link)
  const handleShowAllWeeks = () => {
    setActiveWeek(null);
    setView('calendar');
  };

  // ── Wizard full-page ──────────────────────────────────────────────────────
  if (showWizard) {
    return (
      <DataLoader>
        <WizardContainer
          recipes={allRecipes}
          onComplete={handleWizardComplete}
          onCancel={hasPlans ? handleWizardCancel : undefined}
        />
      </DataLoader>
    );
  }

  // ── Calendar sub-view resolution ─────────────────────────────────────────
  const calendarContent = () => {
    if (activeWeekStart && weeks[activeWeekStart]) {
      return (
        <div key={activeWeekStart} className="h-full slide-from-right">
          <WeekDetailView weekPlan={weeks[activeWeekStart]} recipes={allRecipes} />
        </div>
      );
    }
    return (
      <div key="month" className="h-full slide-from-left">
        <MonthCalendar recipes={allRecipes} />
      </div>
    );
  };

  // ── Main App ──────────────────────────────────────────────────────────────
  return (
    <DataLoader>
      <div className="flex flex-col h-screen bg-zinc-50 overflow-hidden">
        {/* Loading overlay while data syncs */}
        {!hydrated && (
          <div className="absolute inset-0 z-50 bg-white flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
              <p className="text-sm text-zinc-400 font-medium">Loading your data…</p>
            </div>
          </div>
        )}

        {/* Top app bar */}
        <header className="bg-white border-b border-zinc-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-orange-500" />
            <span className="font-black text-zinc-900">WeekCraft</span>
          </div>
          <div className="flex items-center gap-2">
            <HouseholdSwitcher />
            <button
              onClick={handleNewPlan}
              className="text-xs text-zinc-400 hover:text-zinc-600 underline cursor-pointer"
            >
              New plan
            </button>
            <Link
              href="/settings"
              className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-white text-xs font-black hover:bg-zinc-700 transition flex-shrink-0"
              aria-label="Account settings"
            >
              {(session?.user?.name ?? '?').slice(0, 2).toUpperCase()}
            </Link>
          </div>
        </header>

        {/* View */}
        <div className="flex-1 overflow-hidden">
          {view === 'home' && <HomeView recipes={allRecipes} onShowAllWeeks={handleShowAllWeeks} />}
          {view === 'calendar' && calendarContent()}
          {view === 'shopping' && <ShoppingList />}
          {view === 'recipes'  && <RecipesView seedRecipes={seedRecipes} />}
        </div>

        {/* Bottom nav */}
        <nav className="bg-white border-t border-zinc-200 px-4 py-2 flex-shrink-0">
          <div className="flex justify-around max-w-sm mx-auto">
            {NAV.map((item) => {
              const isActive = view === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'calendar') setActiveWeek(null);
                    setView(item.id);
                  }}
                  className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all cursor-pointer
                    ${isActive ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
                >
                  {item.icon}
                  <span className="text-xs font-semibold">{item.label}</span>
                  {isActive && <div className="w-1 h-1 rounded-full bg-zinc-900" />}
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </DataLoader>
  );
}
