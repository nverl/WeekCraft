'use client';

import { Clock, Flame, Shuffle, Leaf, Zap, ChevronRight } from 'lucide-react';
import { parseISODuration } from '@/app/store/wizardStore';
import type { DayPlan, DayLabel } from '@/app/types';

import { Dumbbell } from 'lucide-react';

const LABEL_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string; border: string; text: string }> = {
  healthy:        { icon: <Leaf size={13} />,     color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'Healthy'      },
  'high-protein': { icon: <Dumbbell size={13} />, color: 'text-violet-700',  bg: 'bg-violet-50',  border: 'border-violet-200',  text: 'High Protein' },
  'low-carb':     { icon: <Zap size={13} />,      color: 'text-sky-700',     bg: 'bg-sky-50',     border: 'border-sky-200',     text: 'Low Carb'     },
  cheat:          { icon: <Flame size={13} />,    color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-200',  text: 'Cheat Day'    },
  any:            { icon: <Shuffle size={13} />,  color: 'text-zinc-600',    bg: 'bg-zinc-50',    border: 'border-zinc-200',    text: 'Any'          },
};

interface MealCardProps {
  dayPlan: DayPlan;
  onSwap: () => void;
  onOpen: () => void;
  onMarkFree?: () => void;
}

export default function MealCard({ dayPlan, onSwap, onOpen, onMarkFree }: MealCardProps) {
  const { recipe, label } = dayPlan;

  // Guard: should not be rendered for none/free days, but be defensive
  if (!recipe || label === 'none') return null;

  const cfg = LABEL_CONFIG[label as DayLabel];

  return (
    <div
      className={`relative bg-white border-2 ${cfg.border} rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow`}
    >
      {/* Label stripe */}
      <div className={`${cfg.bg} px-5 py-2.5 flex items-center justify-between`}>
        <div className={`flex items-center gap-1.5 text-xs font-semibold ${cfg.color}`}>
          {cfg.icon}
          {cfg.text}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onSwap(); }}
          className={`flex items-center gap-1 text-xs font-medium ${cfg.color} hover:opacity-70 transition-opacity cursor-pointer`}
          title="Swap this meal"
          aria-label="Swap recipe"
        >
          <Shuffle size={13} />
          Swap
        </button>
      </div>

      {/* Main content — clickable to open modal */}
      <button
        onClick={onOpen}
        className="w-full text-left p-5 cursor-pointer group"
      >
        <h3 className="text-lg font-black text-zinc-900 leading-tight mb-3 group-hover:text-zinc-600 transition-colors">
          {recipe.name}
        </h3>

        <div className="flex items-center gap-4 text-sm text-zinc-500">
          <span className="flex items-center gap-1.5">
            <Clock size={14} />
            {parseISODuration(recipe.prepTimeISO)}
          </span>
          <span className="flex items-center gap-1.5">
            <Flame size={14} />
            {recipe.caloriesPerPerson} kcal
          </span>
        </div>

        <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-zinc-400 group-hover:text-zinc-600 transition-colors">
          View recipe
          <ChevronRight size={13} />
        </div>
      </button>

      {/* Mark as free day — unobtrusive link at the bottom */}
      {onMarkFree && (
        <button
          onClick={onMarkFree}
          className="w-full text-xs text-zinc-300 hover:text-zinc-500 py-2 border-t border-zinc-100 transition-colors cursor-pointer"
        >
          Mark as free day
        </button>
      )}
    </div>
  );
}
