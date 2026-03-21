'use client';

import { useState } from 'react';
import { X, Search, Clock, Flame } from 'lucide-react';
import { parseISODuration } from '@/app/store/wizardStore';
import type { Recipe, DayLabel } from '@/app/types';

const LABEL_BADGE: Record<DayLabel, { color: string; bg: string; short: string }> = {
  healthy:    { color: 'text-emerald-700', bg: 'bg-emerald-50', short: 'H'  },
  'low-carb': { color: 'text-sky-700',     bg: 'bg-sky-50',     short: 'LC' },
  cheat:      { color: 'text-orange-700',  bg: 'bg-orange-50',  short: 'C'  },
};

interface RecipePickerModalProps {
  recipes: Recipe[];
  /** Recipe IDs already used in this week — shown with a badge and sorted last. */
  usedIds?: Set<string>;
  onSelect: (recipe: Recipe) => void;
  onClose: () => void;
}

export default function RecipePickerModal({ recipes, usedIds, onSelect, onClose }: RecipePickerModalProps) {
  const [search, setSearch] = useState('');

  const filtered = recipes
    .filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
    // Unused recipes first, already-in-week recipes last
    .sort((a, b) => {
      const aUsed = usedIds?.has(a.id) ? 1 : 0;
      const bUsed = usedIds?.has(b.id) ? 1 : 0;
      return aUsed - bUsed;
    });

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-xl flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 flex-shrink-0">
          <h3 className="text-base font-black text-zinc-900">Pick a recipe</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-zinc-100 cursor-pointer transition-colors"
          >
            <X size={18} className="text-zinc-500" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-zinc-100 flex-shrink-0">
          <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2">
            <Search size={14} className="text-zinc-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search recipes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="flex-1 bg-transparent text-sm text-zinc-800 outline-none"
            />
          </div>
        </div>

        {/* Recipe list */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {filtered.map((recipe) => (
            <button
              key={recipe.id}
              onClick={() => onSelect(recipe)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-zinc-50 text-left transition-colors cursor-pointer group"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-zinc-900 truncate group-hover:text-zinc-700">
                  {recipe.name}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Clock size={11} />
                    {parseISODuration(recipe.prepTimeISO)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Flame size={11} />
                    {recipe.caloriesPerPerson} kcal
                  </span>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                {usedIds?.has(recipe.id) && (
                  <span className="text-[9px] font-medium text-zinc-400 border border-zinc-200 rounded-md px-1.5 py-0.5 leading-none">
                    This week
                  </span>
                )}
                <div className="flex gap-1">
                  {recipe.labels.map((label) => {
                    const cfg = LABEL_BADGE[label];
                    return (
                      <span
                        key={label}
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${cfg.bg} ${cfg.color}`}
                      >
                        {cfg.short}
                      </span>
                    );
                  })}
                </div>
              </div>
            </button>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-8 text-sm text-zinc-400">No recipes found</div>
          )}
        </div>
      </div>
    </div>
  );
}
