'use client';

import { useState } from 'react';
import { X, Clock, Flame, Users, Leaf, Zap, ChefHat, ExternalLink, StickyNote, Dumbbell, Shuffle } from 'lucide-react';
import { parseISODuration } from '@/app/store/wizardStore';
import { useRecipeStore } from '@/app/store/recipeStore';
import type { DayPlan, DayLabel } from '@/app/types';

/** Extract YouTube video ID from various URL formats */
function extractYoutubeId(url: string): string | null {
  try {
    const u = new URL(url);
    // youtube.com/watch?v=ID  or  youtube.com/embed/ID
    if (u.hostname.includes('youtube.com')) {
      return u.searchParams.get('v') ?? u.pathname.split('/').pop() ?? null;
    }
    // youtu.be/ID
    if (u.hostname === 'youtu.be') {
      return u.pathname.slice(1) || null;
    }
  } catch {
    // not a valid URL
  }
  return null;
}

const LABEL_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string; text: string }> = {
  healthy:        { icon: <Leaf size={13} />,     color: 'text-emerald-700', bg: 'bg-emerald-100', text: 'Healthy'      },
  'high-protein': { icon: <Dumbbell size={13} />, color: 'text-violet-700',  bg: 'bg-violet-100',  text: 'High Protein' },
  'low-carb':     { icon: <Zap size={13} />,      color: 'text-sky-700',     bg: 'bg-sky-100',     text: 'Low Carb'     },
  cheat:          { icon: <Flame size={13} />,    color: 'text-orange-700',  bg: 'bg-orange-100',  text: 'Cheat Day'    },
  any:            { icon: <Shuffle size={13} />,  color: 'text-zinc-600',    bg: 'bg-zinc-100',    text: 'Any'          },
};

interface RecipeModalProps {
  dayPlan: DayPlan;
  people: number;
  onClose: () => void;
}

export default function RecipeModal({ dayPlan, people, onClose }: RecipeModalProps) {
  const { recipe, scaledIngredients, label } = dayPlan;
  const cfg = LABEL_CONFIG[label as DayLabel] ?? LABEL_CONFIG.healthy;
  const { recipeNotes, setRecipeNote } = useRecipeStore();
  const [noteVal, setNoteVal] = useState(() => (recipe ? (recipeNotes[recipe.id] ?? '') : ''));
  if (!recipe) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={recipe.name}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full sm:max-w-lg bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 pb-3 border-b border-zinc-100 flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
                  {cfg.icon}{cfg.text}
                </div>
                {recipe.cuisine && (
                  <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-600">
                    {recipe.cuisine}
                  </div>
                )}
              </div>
              <h2 className="text-xl font-black text-zinc-900 leading-tight">{recipe.name}</h2>
              <div className="flex items-center gap-4 mt-2 text-sm text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <Clock size={14} className="text-zinc-400" />
                  {parseISODuration(recipe.prepTimeISO)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Flame size={14} className="text-zinc-400" />
                  {recipe.caloriesPerPerson} kcal/person
                </span>
                <span className="flex items-center gap-1.5">
                  <Users size={14} className="text-zinc-400" />
                  {people} {people === 1 ? 'serving' : 'servings'}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">

          {/* YouTube embed */}
          {recipe.youtubeUrl && (() => {
            const videoId = extractYoutubeId(recipe.youtubeUrl);
            return videoId ? (
              <div className="px-5 pt-4">
                <div className="relative w-full rounded-2xl overflow-hidden bg-black" style={{ paddingBottom: '56.25%' }}>
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={`https://www.youtube.com/embed/${videoId}`}
                    title={recipe.name}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            ) : null;
          })()}

          {/* Source URL */}
          {recipe.sourceUrl && (
            <div className="px-5 pt-3">
              <a
                href={recipe.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                <ExternalLink size={12} />
                View original recipe
              </a>
            </div>
          )}

          {/* Instructions */}
          <div className="p-5 pb-3">
            <div className="flex items-center gap-2 mb-3">
              <ChefHat size={15} className="text-zinc-400" />
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Instructions</h3>
            </div>
            <ol className="flex flex-col gap-3">
              {recipe.instructions.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-900 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm text-zinc-700 leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* Ingredients */}
          <div className="p-5 pt-3">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                Ingredients (scaled for {people})
              </span>
            </div>
            <div className="bg-zinc-50 rounded-2xl divide-y divide-zinc-100">
              {scaledIngredients.map((ing, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-zinc-700">{ing.name}</span>
                  <span className="text-sm font-semibold text-zinc-900 ml-4 text-right">
                    {ing.amount} {ing.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* My Notes */}
          <div className="px-5 pb-6">
            <div className="flex items-center gap-2 mb-2">
              <StickyNote size={15} className="text-zinc-400" />
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">My Notes</h3>
            </div>
            <textarea
              value={noteVal}
              onChange={(e) => setNoteVal(e.target.value)}
              onBlur={() => setRecipeNote(recipe.id, noteVal)}
              placeholder="Add personal notes, tips, substitutions…"
              rows={3}
              className="w-full text-sm text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900 placeholder:text-zinc-300"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
