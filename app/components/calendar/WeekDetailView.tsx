'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, RefreshCw, Coffee, ArrowLeftRight, ChefHat, Clock, Flame, Users, Plus, Minus, X } from 'lucide-react';
import { useWizardStore, parseISODuration } from '@/app/store/wizardStore';
import { useWeekPlanStore } from '@/app/store/weekPlanStore';
import { useExtrasStore } from '@/app/store/extrasStore';
import { formatWeekRange, parseISOToMins } from '@/app/lib/weekUtils';
import RecipeModal from './RecipeModal';
import RecipePickerModal from './RecipePickerModal';
import ExtraPickerModal from '@/app/components/extras/ExtraPickerModal';
import type { Recipe, DayPlan, WeekPlan, DayLabel, Extra } from '@/app/types';

const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Left-border accent per label — full class strings so Tailwind scanner picks them up
const LABEL_BORDER_COLOR: Record<string, string> = {
  healthy:    'border-l-emerald-400',
  'low-carb': 'border-l-sky-400',
  cheat:      'border-l-orange-400',
  none:       'border-l-zinc-200',
};

// Badge style per label
const LABEL_BADGE: Record<string, { bg: string; text: string; short: string }> = {
  healthy:    { bg: 'bg-emerald-100', text: 'text-emerald-700', short: 'Healthy'  },
  'low-carb': { bg: 'bg-sky-100',     text: 'text-sky-700',     short: 'Low Carb' },
  cheat:      { bg: 'bg-orange-100',  text: 'text-orange-700',  short: 'Cheat'    },
};

// ── DayRow ────────────────────────────────────────────────────────────────────

interface DayRowProps {
  dayPlan: DayPlan;
  dayIndex: number;
  isToday: boolean;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  /** Week-level fallback headcount */
  people: number;
  recipes: Recipe[];
  usedIds: Set<string>;
  onOpenRecipe: () => void;
  onMarkFree: () => void;
  onAssignRecipe: (recipe: Recipe, label: DayLabel) => void;
  onSetPeople: (n: number) => void;
}

function DayRow({
  dayPlan, dayIndex, isToday, isExpanded, onToggleExpanded, people, recipes, usedIds,
  onOpenRecipe, onMarkFree, onAssignRecipe, onSetPeople,
}: DayRowProps) {
  const expanded = isExpanded;
  const setExpanded = (val: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof val === 'function' ? val(expanded) : val;
    if (next !== expanded) onToggleExpanded();
  };
  // Single picker handles both "Swap recipe" (recipe days) and "Assign recipe" (free days)
  const [showPicker, setShowPicker] = useState(false);

  // Per-day headcount (falls back to week-level)
  const effectivePeople = dayPlan.people ?? people;

  const isFree = dayPlan.label === 'none';
  const borderColor = LABEL_BORDER_COLOR[dayPlan.label] ?? 'border-l-zinc-200';
  const badge = !isFree ? (LABEL_BADGE[dayPlan.label] ?? null) : null;

  const date = new Date(dayPlan.date);
  const dateNum = date.getDate();
  const monthShort = date.toLocaleDateString('en-US', { month: 'short' });

  return (
    <>
      <div
        className={`bg-white border border-zinc-200 border-l-4 ${borderColor} rounded-2xl overflow-hidden transition-shadow hover:shadow-sm`}
      >
        {/* Row header — always visible. Split into click-to-expand area + swap button (siblings to avoid nested buttons). */}
        <div className="flex items-center">
          {/* Clickable expand area */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setExpanded((e) => !e)}
            onKeyDown={(e) => e.key === 'Enter' && setExpanded((prev) => !prev)}
            className="flex-1 flex items-center gap-3 px-4 py-3 cursor-pointer min-w-0"
          >
            {/* Date column */}
            <div className="flex-shrink-0 flex flex-col items-center w-9">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide leading-none">
                {DAY_SHORT[dayIndex]}
              </span>
              {isToday ? (
                <span className="mt-0.5 w-6 h-6 flex items-center justify-center rounded-full bg-zinc-900 text-white text-xs font-black leading-none">
                  {dateNum}
                </span>
              ) : (
                <>
                  <span className="mt-0.5 text-sm font-black text-zinc-800 leading-tight">{dateNum}</span>
                  <span className="text-[9px] text-zinc-300 leading-none">{monthShort}</span>
                </>
              )}
            </div>

            {/* Recipe / free content */}
            <div className="flex-1 min-w-0">
              {isFree ? (
                <div className="flex items-center gap-1.5">
                  <Coffee size={14} className="text-zinc-400 flex-shrink-0" />
                  <span className="text-sm font-semibold text-zinc-500">Free day</span>
                  {dayPlan.freeNote && (
                    <span className="text-xs text-zinc-400 italic truncate ml-1">{dayPlan.freeNote}</span>
                  )}
                </div>
              ) : (
                <>
                  <div className="text-sm font-bold text-zinc-900 truncate">{dayPlan.recipe?.name}</div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {badge && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${badge.bg} ${badge.text}`}>
                        {badge.short}
                      </span>
                    )}
                    {dayPlan.recipe && (
                      <span className="text-xs text-zinc-400">
                        {parseISODuration(dayPlan.recipe.prepTimeISO)} · {dayPlan.recipe.caloriesPerPerson} kcal
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Swap quick action — recipe days, collapsed state only */}
          {!isFree && !expanded && (
            <button
              onClick={() => setShowPicker(true)}
              className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-zinc-700 px-3 py-1.5 mr-3 rounded-xl hover:bg-zinc-100 transition-colors cursor-pointer"
              aria-label="Swap recipe"
            >
              <ArrowLeftRight size={12} />
              <span className="hidden sm:inline">Swap</span>
            </button>
          )}
        </div>

        {/* Expanded action bar */}
        {expanded && (
          <div className="border-t border-zinc-100 px-4 py-2.5 flex items-center flex-wrap gap-2">
            {isFree ? (
              <button
                onClick={() => { setShowPicker(true); }}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400 transition-all cursor-pointer"
              >
                <ChefHat size={12} />
                Assign recipe
              </button>
            ) : (
              <>
                <button
                  onClick={() => { onOpenRecipe(); setExpanded(false); }}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400 transition-all cursor-pointer"
                >
                  <ChefHat size={12} />
                  View recipe
                </button>
                <button
                  onClick={() => { onMarkFree(); setExpanded(false); }}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-zinc-200 bg-white text-zinc-500 hover:border-zinc-400 transition-all cursor-pointer"
                >
                  <Coffee size={12} />
                  Free day
                </button>

                {/* Per-day people stepper */}
                <div className="ml-auto flex items-center gap-1.5 text-xs text-zinc-500">
                  <Users size={11} className="text-zinc-400" />
                  <button
                    onClick={() => onSetPeople(Math.max(1, effectivePeople - 1))}
                    className="w-5 h-5 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 cursor-pointer transition-colors"
                    aria-label="Fewer people"
                  >
                    <Minus size={9} />
                  </button>
                  <span className="w-4 text-center font-bold text-zinc-700">{effectivePeople}</span>
                  <button
                    onClick={() => onSetPeople(Math.min(12, effectivePeople + 1))}
                    className="w-5 h-5 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 cursor-pointer transition-colors"
                    aria-label="More people"
                  >
                    <Plus size={9} />
                  </button>
                  <span className="text-zinc-400">people</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Recipe picker modal (for free days) */}
      {showPicker && (
        <RecipePickerModal
          recipes={recipes}
          usedIds={usedIds}
          onSelect={(recipe) => {
            const label: DayLabel = (recipe.labels[0] as DayLabel) ?? 'healthy';
            onAssignRecipe(recipe, label);
            setShowPicker(false);
            setExpanded(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface WeekDetailViewProps {
  weekPlan: WeekPlan;
  recipes: Recipe[];
}

export default function WeekDetailView({ weekPlan, recipes }: WeekDetailViewProps) {
  const { plan, people, setPlan, markAsFreeDay, assignRecipeToDay, setDayPeople } = useWizardStore();
  const { weeks, saveWeek, setActiveWeek, openWizardForWeek, toggleExtraForWeek } = useWeekPlanStore();
  const { extras, addExtra } = useExtrasStore();
  const [modalDayIndex, setModalDayIndex] = useState<number | null>(null);
  const [expandedDayIndex, setExpandedDayIndex] = useState<number | null>(null);
  const [showExtrasPicker, setShowExtrasPicker] = useState(false);

  // Load this week's saved days into wizardStore so swapRecipe / markAsFreeDay operate on them
  useEffect(() => {
    setPlan(weekPlan.days);
  }, [weekPlan.weekStart]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist every change (swap / free day / recipe assign) back to weekPlanStore
  useEffect(() => {
    if (plan.length > 0) {
      saveWeek({ ...weekPlan, days: plan });
    }
  }, [plan]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBack = () => setActiveWeek(null);

  const handleRegenerate = () => {
    const { setTargetWeekStart, resetWizard } = useWizardStore.getState();
    resetWizard();
    setTargetWeekStart(weekPlan.weekStart);
    openWizardForWeek(weekPlan.weekStart);
  };

  const days = plan.length > 0 ? plan : weekPlan.days;
  if (days.length === 0) return null;

  // IDs of recipes already assigned this week — for "This week" badge in picker
  const usedThisWeek = new Set(days.filter((d) => d.recipe).map((d) => d.recipe!.id));

  // Extras for this week — backward-compat: entries may be strings or {id,qty}
  const rawExtras = weeks[weekPlan.weekStart]?.selectedExtras ?? [];
  const selectedExtraIds = new Set(rawExtras.map((e) => typeof e === 'string' ? e : e.id));
  const weekExtras: Extra[] = extras.filter((e) => selectedExtraIds.has(e.id));

  // Derive modal plan from index (stays fresh after swaps)
  const modalPlan = modalDayIndex !== null ? days[modalDayIndex] : null;

  // Weekly stats
  const recipeDays = days.filter((d) => d.recipe);
  const mealCount = recipeDays.length;
  const avgKcal = mealCount > 0
    ? Math.round(recipeDays.reduce((s, d) => s + (d.recipe?.caloriesPerPerson ?? 0), 0) / mealCount)
    : 0;
  const avgMins = mealCount > 0
    ? Math.round(recipeDays.reduce((s, d) => s + parseISOToMins(d.recipe?.prepTimeISO ?? 'PT0M'), 0) / mealCount)
    : 0;

  // Today check — stable per render
  const todayStr = new Date().toDateString();

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="bg-white border-b border-zinc-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={handleBack}
          className="flex items-center gap-1 text-sm font-semibold text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer flex-shrink-0"
        >
          <ChevronLeft size={16} />
          <span className="hidden sm:inline">Month</span>
        </button>

        <div className="flex-1 text-center">
          <h2 className="text-sm font-black text-zinc-900">
            {formatWeekRange(weekPlan.weekStart)}
          </h2>
        </div>

        <button
          onClick={handleRegenerate}
          className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 border border-zinc-200 rounded-xl px-3 py-1.5 hover:border-zinc-400 transition-all cursor-pointer flex-shrink-0"
        >
          <RefreshCw size={12} />
          <span className="hidden sm:inline">Regenerate</span>
        </button>
      </div>

      {/* Weekly stats strip */}
      {mealCount > 0 && (
        <div className="bg-white border-b border-zinc-100 px-6 py-2.5 flex items-center justify-around flex-shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <ChefHat size={13} className="text-zinc-400" />
            <span><strong className="text-zinc-800 font-bold">{mealCount}</strong> meals</span>
          </div>
          <div className="w-px h-4 bg-zinc-200" />
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Flame size={13} className="text-zinc-400" />
            <span>avg <strong className="text-zinc-800 font-bold">{avgKcal}</strong> kcal</span>
          </div>
          <div className="w-px h-4 bg-zinc-200" />
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Clock size={13} className="text-zinc-400" />
            <span>avg <strong className="text-zinc-800 font-bold">{avgMins}</strong> min</span>
          </div>
        </div>
      )}

      {/* Day rows + extras bar — scrollable area */}
      <div className="flex-1 overflow-y-auto bg-zinc-50 px-4 py-4">
        <div className="max-w-lg mx-auto flex flex-col gap-2">
          {days.map((dayPlan, i) => {
            const isToday = new Date(dayPlan.date).toDateString() === todayStr;
            return (
              <DayRow
                key={i}
                dayPlan={dayPlan}
                dayIndex={i}
                isToday={isToday}
                isExpanded={expandedDayIndex === i}
                onToggleExpanded={() => setExpandedDayIndex(expandedDayIndex === i ? null : i)}
                people={people}
                recipes={recipes}
                usedIds={usedThisWeek}
                onOpenRecipe={() => setModalDayIndex(i)}
                onMarkFree={() => { markAsFreeDay(i, '', null); setExpandedDayIndex(null); }}
                onAssignRecipe={(recipe, label) => assignRecipeToDay(i, recipe, label)}
                onSetPeople={(n) => setDayPeople(i, n)}
              />
            );
          })}

          {/* ── Extras bar ─────────────────────────────────────────────────── */}
          <div className="bg-white border border-zinc-200 rounded-2xl px-4 py-3.5 mt-1">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2.5">
              Extras this week
            </p>
            <div className="flex flex-wrap gap-2">
              {weekExtras.map((extra) => (
                <span
                  key={extra.id}
                  className="flex items-center gap-1.5 bg-zinc-100 rounded-full pl-2.5 pr-1.5 py-1.5 text-xs font-semibold text-zinc-700"
                >
                  <span>{extra.emoji}</span>
                  {extra.name}
                  <button
                    onClick={() => toggleExtraForWeek(weekPlan.weekStart, extra.id)}
                    className="w-4 h-4 flex items-center justify-center rounded-full bg-zinc-200 hover:bg-zinc-300 text-zinc-500 hover:text-zinc-700 cursor-pointer transition-colors"
                    aria-label={`Remove ${extra.name}`}
                  >
                    <X size={9} />
                  </button>
                </span>
              ))}
              <button
                onClick={() => setShowExtrasPicker(true)}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-dashed transition-colors cursor-pointer
                  ${weekExtras.length === 0
                    ? 'border-zinc-300 text-zinc-400 hover:border-zinc-500 hover:text-zinc-600'
                    : 'border-zinc-200 text-zinc-400 hover:border-zinc-400 hover:text-zinc-600'
                  }`}
              >
                <Plus size={11} />
                {weekExtras.length === 0 ? 'Add extras' : 'Add more'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recipe modal */}
      {modalPlan && modalPlan.recipe && (
        <RecipeModal
          dayPlan={modalPlan}
          people={people}
          onClose={() => setModalDayIndex(null)}
        />
      )}

      {/* Extras picker modal */}
      {showExtrasPicker && (
        <ExtraPickerModal
          extras={extras}
          selectedIds={selectedExtraIds}
          onToggle={(extra) => toggleExtraForWeek(weekPlan.weekStart, extra.id)}
          onAddCustom={(data) => addExtra(data)}
          onClose={() => setShowExtrasPicker(false)}
        />
      )}
    </div>
  );
}
