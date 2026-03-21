'use client';

import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import type { Extra, ExtraCategory, Ingredient, IngredientEntry } from '@/app/types';
import IngredientAutocomplete from '@/app/components/ingredients/IngredientAutocomplete';

const AISLES = [
  'Baking', 'Bread & Bakery', 'Canned Goods', 'Condiments',
  'Dairy & Eggs', 'Frozen Foods', 'Grains & Pasta', 'Meat & Poultry',
  'Oils & Vinegars', 'Produce', 'Seafood', 'Spices', 'Other',
];

const CATEGORY_OPTIONS: { value: ExtraCategory; label: string; emoji: string }[] = [
  { value: 'drink',     label: 'Drink',     emoji: '🥤' },
  { value: 'breakfast', label: 'Breakfast', emoji: '🥣' },
  { value: 'snack',     label: 'Snack',     emoji: '🍎' },
  { value: 'other',     label: 'Other',     emoji: '🍴' },
];

interface FormIngredient {
  name: string;
  amount: string;
  unit: string;
  aisle: string;
  isStaple: boolean;
}

function blankIngredient(): FormIngredient {
  return { name: '', amount: '', unit: '', aisle: 'Produce', isStaple: false };
}

interface ExtraEditorProps {
  initial?: Extra;
  onSave: (data: Omit<Extra, 'id' | 'isCustom'>) => void;
  onCancel: () => void;
}

export default function ExtraEditor({ initial, onSave, onCancel }: ExtraEditorProps) {
  const [emoji,    setEmoji]    = useState(initial?.emoji    ?? '🥤');
  const [name,     setName]     = useState(initial?.name     ?? '');
  const [category, setCategory] = useState<ExtraCategory>(initial?.category ?? 'snack');
  const [ingredients, setIngredients] = useState<FormIngredient[]>(
    initial?.ingredients.length
      ? initial.ingredients.map((i) => ({ ...i, amount: String(i.amount) }))
      : [blankIngredient()]
  );
  const [errors, setErrors] = useState<string[]>([]);

  // ── Ingredient helpers ─────────────────────────────────────────────────────
  const addIngredient = () => setIngredients((p) => [...p, blankIngredient()]);
  const updateIngredient = <K extends keyof FormIngredient>(i: number, key: K, val: FormIngredient[K]) =>
    setIngredients((p) => p.map((ing, j) => j === i ? { ...ing, [key]: val } : ing));
  const removeIngredient = (i: number) =>
    setIngredients((p) => p.length > 1 ? p.filter((_, j) => j !== i) : p);

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = () => {
    const errs: string[] = [];
    if (!name.trim()) errs.push('Name is required.');
    // Filter out completely blank ingredient rows
    const filledIngredients = ingredients.filter((i) => i.name.trim());
    if (filledIngredients.some((i) => isNaN(parseFloat(i.amount)))) {
      errs.push('All ingredient amounts must be numbers.');
    }
    if (errs.length) { setErrors(errs); return; }

    const parsedIngredients: Ingredient[] = filledIngredients.map((i) => ({
      name: i.name.trim(),
      amount: parseFloat(i.amount) || 1,
      unit: i.unit.trim() || 'piece',
      aisle: i.aisle,
      isStaple: i.isStaple,
    }));

    onSave({ name: name.trim(), emoji: emoji || '🍴', category, ingredients: parsedIngredients });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full sm:max-w-lg bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 flex-shrink-0">
          <h2 className="text-lg font-black text-zinc-900">
            {initial ? 'Edit Extra' : 'New Extra'}
          </h2>
          <button
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable form */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">

          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              {errors.map((e, i) => <p key={i} className="text-sm text-red-700">{e}</p>)}
            </div>
          )}

          {/* Emoji + Name */}
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">
              Name *
            </label>
            <div className="flex gap-2">
              <input
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                className="w-14 text-center text-2xl border border-zinc-200 rounded-xl py-2.5 focus:outline-none focus:ring-2 focus:ring-zinc-900 flex-shrink-0"
                maxLength={2}
                aria-label="Emoji"
              />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Granola yoghurt"
                className="flex-1 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">Category</label>
            <div className="flex gap-2 flex-wrap">
              {CATEGORY_OPTIONS.map((opt) => {
                const active = category === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCategory(opt.value)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-sm font-semibold transition-all cursor-pointer
                      ${active
                        ? 'bg-zinc-900 border-zinc-900 text-white'
                        : 'border-zinc-200 text-zinc-500 hover:border-zinc-400'
                      }`}
                  >
                    <span>{opt.emoji}</span> {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ingredients */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                Shopping items
              </label>
              <button
                type="button"
                onClick={addIngredient}
                className="flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-zinc-900 cursor-pointer"
              >
                <Plus size={13} /> Add item
              </button>
            </div>
            <p className="text-xs text-zinc-400 mb-3">
              These ingredients will be added to your shopping list when this extra is selected.
            </p>

            <div className="flex flex-col gap-2">
              {ingredients.map((ing, i) => (
                <div key={i} className="flex gap-2 items-center bg-zinc-50 rounded-xl p-2">
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <IngredientAutocomplete
                      value={ing.name}
                      onChange={(name) => updateIngredient(i, 'name', name)}
                      onSelect={(entry: IngredientEntry) => {
                        updateIngredient(i, 'name', entry.name);
                        if (!ing.unit) updateIngredient(i, 'unit', entry.defaultUnit);
                        updateIngredient(i, 'aisle', entry.aisle);
                      }}
                      placeholder="Item name"
                      className="col-span-2 sm:col-span-1 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white w-full"
                    />
                    <input
                      value={ing.amount}
                      onChange={(e) => updateIngredient(i, 'amount', e.target.value)}
                      placeholder="Qty"
                      type="number"
                      min="0"
                      step="0.25"
                      className="border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
                    />
                    <input
                      value={ing.unit}
                      onChange={(e) => updateIngredient(i, 'unit', e.target.value)}
                      placeholder="Unit (g, ml…)"
                      className="border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
                    />
                    <select
                      value={ing.aisle}
                      onChange={(e) => updateIngredient(i, 'aisle', e.target.value)}
                      className="border border-zinc-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
                    >
                      {AISLES.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <label className="flex items-center gap-1 text-xs text-zinc-500 cursor-pointer flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={ing.isStaple}
                      onChange={(e) => updateIngredient(i, 'isStaple', e.target.checked)}
                      className="rounded"
                    />
                    Staple
                  </label>
                  <button
                    type="button"
                    onClick={() => removeIngredient(i)}
                    className="text-zinc-300 hover:text-red-400 cursor-pointer transition-colors flex-shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-zinc-100 flex-shrink-0">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl border border-zinc-200 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 rounded-2xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-700 cursor-pointer transition-colors"
          >
            {initial ? 'Save Changes' : 'Add Extra'}
          </button>
        </div>
      </div>
    </div>
  );
}
