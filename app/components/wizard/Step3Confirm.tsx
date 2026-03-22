'use client';

import { Clock, Flame, Leaf, Zap, Coffee, CheckCircle2, Dumbbell, Shuffle, ShoppingBag } from 'lucide-react';
import { useWizardStore, parseISODuration } from '@/app/store/wizardStore';
import { useExtrasStore } from '@/app/store/extrasStore';
import type { DayPlan, DayLabel } from '@/app/types';

const LABEL_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  healthy:        { icon: <Leaf size={12} />,     color: 'text-emerald-700', bg: 'bg-emerald-100' },
  'high-protein': { icon: <Dumbbell size={12} />, color: 'text-violet-700',  bg: 'bg-violet-100'  },
  'low-carb':     { icon: <Zap size={12} />,      color: 'text-sky-700',     bg: 'bg-sky-100'     },
  cheat:          { icon: <Flame size={12} />,    color: 'text-orange-700',  bg: 'bg-orange-100'  },
  any:            { icon: <Shuffle size={12} />,  color: 'text-zinc-600',    bg: 'bg-zinc-100'    },
};

function PlanCard({ dayPlan }: { dayPlan: DayPlan }) {
  const date = new Date(dayPlan.date);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // Free / none day
  if (dayPlan.label === 'none' || !dayPlan.recipe) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-xl bg-zinc-50 border border-zinc-200">
        <div className="flex-shrink-0 w-14 text-center">
          <div className="text-xs font-semibold text-zinc-500">{dayPlan.day.slice(0, 3)}</div>
          <div className="text-xs text-zinc-400">{dateStr}</div>
          <div className="mt-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium bg-zinc-200 text-zinc-500">
            <Coffee size={11} />
          </div>
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <h4 className="font-semibold text-zinc-500 text-sm">Free day</h4>
          {dayPlan.freeNote && (
            <p className="text-xs text-zinc-400 mt-0.5 italic">{dayPlan.freeNote}</p>
          )}
          {dayPlan.freeCalories && (
            <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1">
              <Flame size={11} />
              {dayPlan.freeCalories} kcal
            </p>
          )}
        </div>
      </div>
    );
  }

  const cfg = LABEL_CONFIG[dayPlan.label as DayLabel];

  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-white border border-zinc-200 hover:border-zinc-300 transition-colors">
      {/* Day column */}
      <div className="flex-shrink-0 w-14 text-center">
        <div className="text-xs font-semibold text-zinc-500">{dayPlan.day.slice(0, 3)}</div>
        <div className="text-xs text-zinc-400">{dateStr}</div>
        <div
          className={`mt-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}
        >
          {cfg.icon}
        </div>
      </div>

      {/* Recipe info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-zinc-900 text-sm leading-tight">{dayPlan.recipe.name}</h4>
        <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {parseISODuration(dayPlan.recipe.prepTimeISO)}
          </span>
          <span className="flex items-center gap-1">
            <Flame size={11} />
            {dayPlan.recipe.caloriesPerPerson} kcal/person
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Step3Confirm() {
  const { plan, people, days, selectedExtras } = useWizardStore();
  const { extras } = useExtrasStore();

  if (plan.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-400">
        <p>No plan generated yet.</p>
      </div>
    );
  }

  const recipeDays = plan.filter((p) => p.recipe !== null).length;
  const freeDays = plan.filter((p) => p.label === 'none').length;
  const uniqueRecipes = new Set(plan.filter((p) => p.recipe).map((p) => p.recipe!.id)).size;

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <CheckCircle2 size={22} className="text-emerald-500" />
        <h2 className="text-2xl font-bold text-zinc-900">Your plan is ready!</h2>
      </div>
      <p className="text-zinc-500 mb-5 text-sm">
        {recipeDays} meal{recipeDays !== 1 ? 's' : ''} for {people} {people === 1 ? 'person' : 'people'} across {days} {days === 1 ? 'day' : 'days'}.
        {freeDays > 0 && ` ${freeDays} free day${freeDays > 1 ? 's' : ''}.`}
        {uniqueRecipes < recipeDays && ' Some recipes repeat.'}
      </p>

      <div className="flex flex-col gap-2 mb-4">
        {plan.map((dayPlan, i) => (
          <PlanCard key={i} dayPlan={dayPlan} />
        ))}
      </div>

      {/* Extras summary */}
      {selectedExtras.length > 0 && (
        <div className="mt-4 bg-zinc-50 border border-zinc-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingBag size={14} className="text-zinc-400" />
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Weekly extras</span>
          </div>
          <div className="flex flex-col gap-2">
            {selectedExtras.map((sel) => {
              const extra = extras.find((e) => e.id === sel.id);
              if (!extra) return null;
              return (
                <div key={sel.id} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-zinc-700">
                    <span>{extra.emoji}</span>
                    <span className="font-medium">{extra.name}</span>
                  </span>
                  <span className="text-xs font-semibold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">
                    ×{sel.qty}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-xs text-zinc-400 text-center mt-3">
        You can swap individual meals on the calendar after confirming.
      </p>
    </div>
  );
}
