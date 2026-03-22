'use client';

import { Clock, Flame, ChevronRight, Shuffle } from 'lucide-react';
import { parseISODuration } from '@/app/store/wizardStore';
import { LABEL_CONFIG, DEFAULT_LABEL } from '@/app/constants/labels';
import type { DayPlan } from '@/app/types';

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

  const cfg = LABEL_CONFIG[label] ?? DEFAULT_LABEL;

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
