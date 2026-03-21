'use client';

import { useState } from 'react';
import { Coffee, Pencil, Check, ChefHat, Flame } from 'lucide-react';
import { useWizardStore } from '@/app/store/wizardStore';
import type { DayPlan, Recipe, DayLabel } from '@/app/types';
import RecipePickerModal from './RecipePickerModal';

interface FreeDayCardProps {
  dayPlan: DayPlan;
  dayIndex: number;
  recipes: Recipe[];
}

export default function FreeDayCard({ dayPlan, dayIndex, recipes }: FreeDayCardProps) {
  const { markAsFreeDay, assignRecipeToDay } = useWizardStore();
  const [editNote, setEditNote] = useState<string | null>(null);   // null = not editing
  const [editCal, setEditCal] = useState<string | null>(null);     // null = not editing
  const [showPicker, setShowPicker] = useState(false);

  // ── Note editing ─────────────────────────────────────────────────────────

  const handleSaveNote = () => {
    if (editNote !== null) {
      markAsFreeDay(dayIndex, editNote, dayPlan.freeCalories ?? null);
      setEditNote(null);
    }
  };

  const handleCancelNote = () => setEditNote(null);

  // ── Calorie editing ───────────────────────────────────────────────────────

  const handleSaveCal = () => {
    if (editCal !== null) {
      const cal = editCal.trim() ? Number(editCal) : null;
      markAsFreeDay(dayIndex, dayPlan.freeNote ?? '', cal);
      setEditCal(null);
    }
  };

  const handleCancelCal = () => setEditCal(null);

  // ── Assign recipe ─────────────────────────────────────────────────────────

  const handleAssignRecipe = (recipe: Recipe) => {
    const label = (recipe.labels[0] ?? 'healthy') as DayLabel;
    assignRecipeToDay(dayIndex, recipe, label);
    setShowPicker(false);
  };

  return (
    <>
      <div className="bg-white border-2 border-dashed border-zinc-200 rounded-3xl overflow-hidden">
        {/* Header stripe */}
        <div className="bg-zinc-50 px-5 py-2.5 flex items-center gap-2 border-b border-zinc-100">
          <Coffee size={14} className="text-zinc-400" />
          <span className="text-xs font-semibold text-zinc-500">Free day — no recipe</span>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Note field */}
          <div>
            <p className="text-xs font-semibold text-zinc-400 mb-2">Note</p>
            {editNote !== null ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="e.g. Restaurant, Leftovers, Take-away…"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveNote();
                    if (e.key === 'Escape') handleCancelNote();
                  }}
                  className="flex-1 border border-zinc-200 rounded-xl px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:border-zinc-400"
                />
                <button
                  onClick={handleSaveNote}
                  className="p-2 rounded-xl bg-zinc-900 text-white hover:bg-zinc-700 cursor-pointer transition-colors"
                >
                  <Check size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditNote(dayPlan.freeNote ?? '')}
                className="flex items-center gap-2 w-full text-left text-sm cursor-pointer group"
              >
                <span className={`flex-1 ${dayPlan.freeNote ? 'text-zinc-800' : 'text-zinc-400 italic'}`}>
                  {dayPlan.freeNote || 'Add a note…'}
                </span>
                <Pencil size={13} className="text-zinc-300 group-hover:text-zinc-500 flex-shrink-0" />
              </button>
            )}
          </div>

          {/* Calories field */}
          <div>
            <p className="text-xs font-semibold text-zinc-400 mb-2">Calories (optional)</p>
            {editCal !== null ? (
              <div className="flex gap-2">
                <input
                  type="number"
                  value={editCal}
                  onChange={(e) => setEditCal(e.target.value)}
                  placeholder="e.g. 600"
                  autoFocus
                  min={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveCal();
                    if (e.key === 'Escape') handleCancelCal();
                  }}
                  className="flex-1 border border-zinc-200 rounded-xl px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:border-zinc-400"
                />
                <button
                  onClick={handleSaveCal}
                  className="p-2 rounded-xl bg-zinc-900 text-white hover:bg-zinc-700 cursor-pointer transition-colors"
                >
                  <Check size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditCal(dayPlan.freeCalories?.toString() ?? '')}
                className="flex items-center gap-2 w-full text-left text-sm cursor-pointer group"
              >
                {dayPlan.freeCalories ? (
                  <span className="flex items-center gap-1.5 text-zinc-700">
                    <Flame size={13} className="text-zinc-400" />
                    {dayPlan.freeCalories} kcal
                  </span>
                ) : (
                  <span className="text-zinc-400 italic flex-1">Add calories…</span>
                )}
                <Pencil size={13} className="text-zinc-300 group-hover:text-zinc-500 flex-shrink-0" />
              </button>
            )}
          </div>

          {/* Assign recipe button */}
          <button
            onClick={() => setShowPicker(true)}
            className="flex items-center gap-2 mt-1 px-4 py-2.5 rounded-2xl border border-zinc-200 text-sm font-semibold text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 transition-all cursor-pointer"
          >
            <ChefHat size={15} />
            Assign a recipe instead
          </button>
        </div>
      </div>

      {showPicker && (
        <RecipePickerModal
          recipes={recipes}
          onSelect={handleAssignRecipe}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
}
