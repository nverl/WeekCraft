'use client';

import { useState, useMemo } from 'react';
import {
  Clock, Flame, Users, Leaf, Zap, ChefHat,
  ArrowLeftRight, Coffee, Plus, CalendarDays, X,
} from 'lucide-react';
import { useWeekPlanStore } from '@/app/store/weekPlanStore';
import { useWizardStore, parseISODuration } from '@/app/store/wizardStore';
import { useExtrasStore } from '@/app/store/extrasStore';
import { useSession } from 'next-auth/react';
import { getWeekStartISO } from '@/app/lib/weekUtils';
import RecipeModal from '@/app/components/calendar/RecipeModal';
import RecipePickerModal from '@/app/components/calendar/RecipePickerModal';
import ExtraPickerModal from '@/app/components/extras/ExtraPickerModal';
import type { Recipe, DayPlan, DayLabel, Extra } from '@/app/types';

// ── Config ────────────────────────────────────────────────────────────────────

const LABEL_CONFIG: Record<string, { icon: React.ReactNode; bg: string; color: string; label: string }> = {
  healthy:    { icon: <Leaf size={12} />,  bg: 'bg-emerald-100', color: 'text-emerald-700', label: 'Healthy'   },
  'low-carb': { icon: <Zap size={12} />,   bg: 'bg-sky-100',     color: 'text-sky-700',     label: 'Low Carb'  },
  cheat:      { icon: <Flame size={12} />, bg: 'bg-orange-100',  color: 'text-orange-700',  label: 'Cheat Day' },
};

const LABEL_DOT: Record<string, string> = {
  healthy:    'bg-emerald-400',
  'low-carb': 'bg-sky-400',
  cheat:      'bg-orange-400',
  none:       'bg-zinc-200',
};

const LABEL_GLOW: Record<string, string> = {
  healthy:    'from-emerald-50 to-white',
  'low-carb': 'from-sky-50 to-white',
  cheat:      'from-orange-50 to-white',
  none:       'from-zinc-50 to-white',
};

const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 22) return 'Good evening';
  return 'Good night';
}

function formatTodayLong(): string {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

// ── DayPill ───────────────────────────────────────────────────────────────────

function DayPill({
  dayPlan, dayIndex, isToday, isActive, onClick,
}: {
  dayPlan: DayPlan | undefined;
  dayIndex: number;
  isToday: boolean;
  isActive: boolean;
  onClick: () => void;
}) {
  const date = dayPlan ? new Date(dayPlan.date) : null;
  const label = dayPlan?.label ?? 'none';
  const dotColor = LABEL_DOT[label] ?? 'bg-zinc-200';
  const hasMeal = dayPlan && label !== 'none' && dayPlan.recipe;
  const isFree = dayPlan && label === 'none';

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 flex-shrink-0 w-12 py-2.5 rounded-2xl transition-all cursor-pointer
        ${isActive
          ? 'bg-zinc-900 shadow-sm'
          : isToday
            ? 'bg-zinc-100'
            : 'hover:bg-zinc-50'
        }`}
    >
      <span className={`text-[10px] font-bold uppercase tracking-wide ${isActive ? 'text-zinc-400' : 'text-zinc-400'}`}>
        {DAY_SHORT[dayIndex]}
      </span>
      <span className={`text-sm font-black leading-none ${isActive ? 'text-white' : isToday ? 'text-zinc-900' : 'text-zinc-700'}`}>
        {date ? date.getDate() : '—'}
      </span>
      {/* Dot */}
      <div className={`w-1.5 h-1.5 rounded-full ${hasMeal ? dotColor : isFree ? 'bg-zinc-200' : 'bg-transparent'}`} />
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface HomeViewProps {
  recipes: Recipe[];
  onShowAllWeeks: () => void;
}

export default function HomeView({ recipes, onShowAllWeeks }: HomeViewProps) {
  const { data: session } = useSession();
  const { weeks, openWizardForWeek, setActiveWeek, toggleExtraForWeek, saveWeek } = useWeekPlanStore();
  const { resetWizard, setTargetWeekStart, setPlan, plan, markAsFreeDay, assignRecipeToDay, people } = useWizardStore();
  const { extras, addExtra } = useExtrasStore();

  // Stable: current week start (computed once — week won't change during session)
  const todayWeekStart = useMemo(() => getWeekStartISO(new Date()), []);
  const weekPlan = weeks[todayWeekStart];

  // Find today's day index
  const todayStr = new Date().toDateString();
  const todayDayIndex = useMemo(() =>
    weekPlan?.days.findIndex((d) => new Date(d.date).toDateString() === todayStr) ?? -1,
    [weekPlan, todayStr]
  );

  // Active day — default to today if it exists, else first day
  const [activeDayIndex, setActiveDayIndex] = useState<number>(() =>
    todayDayIndex >= 0 ? todayDayIndex : 0
  );

  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showExtrasPicker, setShowExtrasPicker] = useState(false);

  const days = weekPlan?.days ?? [];
  const activeDay: DayPlan | undefined = days[activeDayIndex];
  const isToday = activeDayIndex === todayDayIndex;

  // Extras
  const selectedExtraIds = new Set(weeks[todayWeekStart]?.selectedExtras ?? []);
  const weekExtras: Extra[] = extras.filter((e) => selectedExtraIds.has(e.id));

  // Used recipe IDs (for picker "already used" badge)
  const usedIds = new Set(days.filter((d) => d.recipe).map((d) => d.recipe!.id));

  // Plan this week handler
  const handlePlanWeek = () => {
    resetWizard();
    setTargetWeekStart(todayWeekStart);
    openWizardForWeek(todayWeekStart);
  };

  // Assign/swap recipe for active day
  const handleAssignRecipe = (recipe: Recipe, label: DayLabel) => {
    if (!weekPlan) return;
    setPlan(weekPlan.days);
    assignRecipeToDay(activeDayIndex, recipe, label);
    // Persist immediately
    const updated = useWizardStore.getState().plan;
    if (updated.length > 0) saveWeek({ ...weekPlan, days: updated });
  };

  // ── Empty state: no plan for current week ────────────────────────────────
  if (!weekPlan) {
    return (
      <div className="flex flex-col h-full bg-zinc-50">
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-6">
          <div className="w-16 h-16 rounded-3xl bg-zinc-100 flex items-center justify-center">
            <ChefHat size={28} className="text-zinc-400" />
          </div>
          <div>
            <p className="text-lg font-black text-zinc-900">No plan this week</p>
            <p className="text-sm text-zinc-400 mt-1">Create a meal plan to see today's recipe here</p>
          </div>
          <button
            onClick={handlePlanWeek}
            className="px-6 py-3 rounded-2xl bg-zinc-900 text-white text-sm font-bold hover:bg-zinc-700 transition cursor-pointer"
          >
            Plan this week
          </button>
          <button
            onClick={onShowAllWeeks}
            className="text-sm font-semibold text-zinc-400 hover:text-zinc-700 transition cursor-pointer flex items-center gap-1.5"
          >
            <CalendarDays size={14} />
            See other weeks
          </button>
        </div>
      </div>
    );
  }

  const cfg = activeDay ? (LABEL_CONFIG[activeDay.label] ?? null) : null;
  const glow = activeDay ? (LABEL_GLOW[activeDay.label] ?? LABEL_GLOW.none) : LABEL_GLOW.none;
  const isFreeDay = activeDay?.label === 'none';
  const username = session?.user?.name ?? '';

  return (
    <div className="flex flex-col h-full bg-zinc-50 overflow-hidden">
      <div className="flex-1 overflow-y-auto">

        {/* ── Greeting ── */}
        <div className="px-5 pt-5 pb-3">
          <p className="text-xl font-black text-zinc-900">
            {getGreeting()}{username ? `, ${username.split(' ')[0]}` : ''} 👋
          </p>
          <p className="text-sm text-zinc-400 mt-0.5 capitalize">{formatTodayLong()}</p>
        </div>

        {/* ── Day Strip ── */}
        <div className="px-4 pb-1">
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
            {days.map((dayPlan, i) => (
              <DayPill
                key={i}
                dayPlan={dayPlan}
                dayIndex={i}
                isToday={i === todayDayIndex}
                isActive={i === activeDayIndex}
                onClick={() => setActiveDayIndex(i)}
              />
            ))}
          </div>
        </div>

        {/* ── Hero Card ── */}
        {activeDay && (
          <div className="px-4 py-3">
            <div className={`rounded-3xl bg-gradient-to-b ${glow} border border-zinc-100 overflow-hidden shadow-sm`}>

              {/* Label row */}
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {/* Day label */}
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                    {isToday ? 'Today' : DAY_SHORT[activeDayIndex]}
                  </span>

                  {/* Meal type badge */}
                  {cfg && !isFreeDay && (
                    <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
                      {cfg.icon}
                      {cfg.label}
                    </div>
                  )}

                  {/* Cuisine badge */}
                  {activeDay.recipe?.cuisine && (
                    <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-500">
                      {activeDay.recipe.cuisine}
                    </div>
                  )}
                </div>

                {isFreeDay ? (
                  /* Free day state */
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                      <Coffee size={20} className="text-zinc-300" />
                      <span className="text-2xl font-black text-zinc-400">
                        {activeDay.freeNote || 'Free day'}
                      </span>
                    </div>
                    <button
                      onClick={() => setShowPicker(true)}
                      className="self-start flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-900 text-white text-sm font-bold hover:bg-zinc-700 transition cursor-pointer"
                    >
                      <ChefHat size={14} />
                      Assign a recipe
                    </button>
                  </div>
                ) : (
                  /* Recipe state */
                  <div>
                    <h2 className="text-2xl font-black text-zinc-900 leading-tight mb-4">
                      {activeDay.recipe?.name}
                    </h2>

                    {/* Stats row */}
                    <div className="flex items-center gap-4 mb-5">
                      <div className="flex items-center gap-1.5 text-sm text-zinc-500">
                        <Clock size={14} className="text-zinc-400" />
                        {activeDay.recipe ? parseISODuration(activeDay.recipe.prepTimeISO) : '—'}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-zinc-500">
                        <Flame size={14} className="text-zinc-400" />
                        {activeDay.recipe?.caloriesPerPerson} kcal
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-zinc-500">
                        <Users size={14} className="text-zinc-400" />
                        {activeDay.people ?? people} {(activeDay.people ?? people) === 1 ? 'serving' : 'servings'}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowRecipeModal(true)}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-zinc-900 text-white text-sm font-bold hover:bg-zinc-700 transition cursor-pointer"
                      >
                        <ChefHat size={15} />
                        View recipe
                      </button>
                      <button
                        onClick={() => setShowPicker(true)}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-zinc-200 bg-white text-zinc-600 text-sm font-semibold hover:border-zinc-400 transition cursor-pointer"
                        aria-label="Swap recipe"
                      >
                        <ArrowLeftRight size={15} />
                        Swap
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Ingredients preview strip (recipe days only) */}
              {!isFreeDay && activeDay.scaledIngredients && activeDay.scaledIngredients.length > 0 && (
                <div className="border-t border-zinc-100 px-5 py-3">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    Ingredients · scaled for {activeDay.people ?? people}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {activeDay.scaledIngredients.slice(0, 6).map((ing, i) => (
                      <span key={i} className="text-xs bg-white border border-zinc-100 rounded-xl px-2.5 py-1 text-zinc-600 font-medium">
                        {ing.amount} {ing.unit} {ing.name}
                      </span>
                    ))}
                    {activeDay.scaledIngredients.length > 6 && (
                      <span className="text-xs text-zinc-400 px-1 py-1">
                        +{activeDay.scaledIngredients.length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Extras this week ── */}
        <div className="px-4 pb-2">
          <div className="bg-white border border-zinc-100 rounded-3xl px-4 py-4">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-3">
              Extras this week
            </p>
            <div className="flex flex-wrap gap-2">
              {weekExtras.map((extra) => (
                <span
                  key={extra.id}
                  className="flex items-center gap-1.5 bg-zinc-100 rounded-full pl-2.5 pr-1.5 py-1.5 text-xs font-semibold text-zinc-700"
                >
                  {extra.emoji} {extra.name}
                  <button
                    onClick={() => toggleExtraForWeek(todayWeekStart, extra.id)}
                    className="w-4 h-4 flex items-center justify-center rounded-full bg-zinc-200 hover:bg-zinc-300 text-zinc-500 cursor-pointer transition-colors"
                    aria-label={`Remove ${extra.name}`}
                  >
                    <X size={9} />
                  </button>
                </span>
              ))}
              <button
                onClick={() => setShowExtrasPicker(true)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-dashed border-zinc-200 text-zinc-400 hover:border-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
              >
                <Plus size={11} />
                {weekExtras.length === 0 ? 'Add extras' : 'Add more'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Footer links ── */}
        <div className="px-4 pb-6 flex items-center justify-between">
          <button
            onClick={onShowAllWeeks}
            className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-zinc-700 transition cursor-pointer"
          >
            <CalendarDays size={13} />
            All weeks
          </button>
          <button
            onClick={() => setActiveWeek(todayWeekStart)}
            className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-zinc-700 transition cursor-pointer"
          >
            Full week view →
          </button>
        </div>

      </div>

      {/* ── Modals ── */}
      {showRecipeModal && activeDay && activeDay.recipe && (
        <RecipeModal
          dayPlan={activeDay}
          people={activeDay.people ?? people}
          onClose={() => setShowRecipeModal(false)}
        />
      )}

      {showPicker && (
        <RecipePickerModal
          recipes={recipes}
          usedIds={usedIds}
          onSelect={(recipe) => {
            const label: DayLabel = (recipe.labels[0] as DayLabel) ?? 'healthy';
            handleAssignRecipe(recipe, label);
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}

      {showExtrasPicker && (
        <ExtraPickerModal
          extras={extras}
          selectedIds={selectedExtraIds}
          onToggle={(extra) => toggleExtraForWeek(todayWeekStart, extra.id)}
          onAddCustom={(data) => addExtra(data)}
          onClose={() => setShowExtrasPicker(false)}
        />
      )}
    </div>
  );
}
