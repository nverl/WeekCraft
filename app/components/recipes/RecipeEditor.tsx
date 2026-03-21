'use client';

import { useState } from 'react';
import { X, Plus, Trash2, Leaf, Zap, Flame, Link, Youtube, Download, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { Recipe, DayLabel, Ingredient, IngredientEntry } from '@/app/types';
import { CUISINES } from '@/app/types';
import IngredientAutocomplete from '@/app/components/ingredients/IngredientAutocomplete';

const AISLES = [
  'Baking', 'Bread & Bakery', 'Canned Goods', 'Condiments',
  'Dairy & Eggs', 'Frozen Foods', 'Grains & Pasta', 'Meat & Poultry',
  'Oils & Vinegars', 'Produce', 'Seafood', 'Spices', 'Other',
];

const LABEL_OPTIONS: { value: DayLabel; label: string; icon: React.ReactNode; color: string; bg: string }[] = [
  { value: 'healthy',   label: 'Healthy',   icon: <Leaf size={14} />,  color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-300' },
  { value: 'low-carb',  label: 'Low Carb',  icon: <Zap size={14} />,   color: 'text-sky-700',     bg: 'bg-sky-50 border-sky-300'         },
  { value: 'cheat',     label: 'Cheat Day', icon: <Flame size={14} />, color: 'text-orange-700',  bg: 'bg-orange-50 border-orange-300'   },
];

interface FormIngredient {
  name: string;
  amount: string;
  unit: string;
  aisle: string;
  isStaple: boolean;
}

interface RecipeEditorProps {
  initial?: Recipe;       // editing an existing recipe
  onSave: (recipe: Omit<Recipe, 'id'>) => void;
  onCancel: () => void;
}

function blankIngredient(): FormIngredient {
  return { name: '', amount: '', unit: '', aisle: 'Produce', isStaple: false };
}

export default function RecipeEditor({ initial, onSave, onCancel }: RecipeEditorProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [labels, setLabels] = useState<DayLabel[]>(initial?.labels ?? ['healthy']);
  const [prepMins, setPrepMins] = useState(
    initial ? parseInt(initial.prepTimeISO.match(/PT(\d+)M/)?.[1] ?? '30') : 30
  );
  const [calories, setCalories] = useState(initial?.caloriesPerPerson ?? 400);
  const [recipeYield, setRecipeYield] = useState(initial?.recipeYield ?? 2);
  const [instructions, setInstructions] = useState<string[]>(
    initial?.instructions ?? ['']
  );
  const [ingredients, setIngredients] = useState<FormIngredient[]>(
    initial?.ingredients.map((i) => ({ ...i, amount: String(i.amount) })) ?? [blankIngredient()]
  );
  const [cuisine, setCuisine] = useState(initial?.cuisine ?? '');
  const [sourceUrl, setSourceUrl] = useState(initial?.sourceUrl ?? '');
  const [youtubeUrl, setYoutubeUrl] = useState(initial?.youtubeUrl ?? '');
  const [errors, setErrors] = useState<string[]>([]);

  // ── URL import ─────────────────────────────────────────────────────────────
  const [importUrl, setImportUrl] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [importError, setImportError] = useState('');

  const handleImport = async () => {
    if (!importUrl.trim()) return;
    setImportStatus('loading');
    setImportError('');
    try {
      const res = await fetch('/api/recipes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setImportStatus('error');
        setImportError(data.error ?? 'Import failed.');
        return;
      }
      // Pre-fill form fields
      if (data.name)         setName(data.name);
      if (data.prepTimeISO)  setPrepMins(parseInt(data.prepTimeISO.match(/PT(\d+)M/)?.[1] ?? '30'));
      if (data.caloriesPerPerson) setCalories(data.caloriesPerPerson);
      if (data.recipeYield)  setRecipeYield(data.recipeYield);
      if (data.ingredients?.length > 0) {
        setIngredients(data.ingredients.map((i: { name: string; amount: number; unit: string; aisle: string; isStaple: boolean }) => ({
          ...i,
          amount: String(i.amount),
        })));
      }
      if (data.instructions?.length > 0) setInstructions(data.instructions);
      if (data.sourceUrl)    setSourceUrl(data.sourceUrl);
      setImportStatus('ok');
    } catch {
      setImportStatus('error');
      setImportError('Network error — please try again.');
    }
  };

  // ── Label toggle ──────────────────────────────────────────────────────────
  const toggleLabel = (l: DayLabel) =>
    setLabels((prev) =>
      prev.includes(l) ? (prev.length > 1 ? prev.filter((x) => x !== l) : prev) : [...prev, l]
    );

  // ── Instructions ─────────────────────────────────────────────────────────
  const addStep = () => setInstructions((p) => [...p, '']);
  const updateStep = (i: number, v: string) =>
    setInstructions((p) => p.map((s, j) => (j === i ? v : s)));
  const removeStep = (i: number) =>
    setInstructions((p) => p.length > 1 ? p.filter((_, j) => j !== i) : p);

  // ── Ingredients ───────────────────────────────────────────────────────────
  const addIngredient = () => setIngredients((p) => [...p, blankIngredient()]);
  const updateIngredient = <K extends keyof FormIngredient>(
    i: number, key: K, val: FormIngredient[K]
  ) => setIngredients((p) => p.map((ing, j) => j === i ? { ...ing, [key]: val } : ing));
  const removeIngredient = (i: number) =>
    setIngredients((p) => p.length > 1 ? p.filter((_, j) => j !== i) : p);

  // ── Validate + Save ───────────────────────────────────────────────────────
  const handleSave = () => {
    const errs: string[] = [];
    if (!name.trim()) errs.push('Recipe name is required.');
    if (ingredients.some((i) => !i.name.trim())) errs.push('All ingredients need a name.');
    if (ingredients.some((i) => isNaN(parseFloat(i.amount)))) errs.push('All ingredient amounts must be numbers.');
    if (instructions.some((s) => !s.trim())) errs.push('Remove empty instruction steps.');
    if (errs.length) { setErrors(errs); return; }

    onSave({
      name: name.trim(),
      labels,
      ...(cuisine ? { cuisine } : {}),
      prepTimeISO: `PT${prepMins}M`,
      caloriesPerPerson: calories,
      recipeYield,
      instructions: instructions.map((s) => s.trim()).filter(Boolean),
      ingredients: ingredients.map((i) => ({
        name: i.name.trim(),
        amount: parseFloat(i.amount),
        unit: i.unit.trim() || 'piece',
        aisle: i.aisle,
        isStaple: i.isStaple,
      })),
      ...(sourceUrl.trim() ? { sourceUrl: sourceUrl.trim() } : {}),
      ...(youtubeUrl.trim() ? { youtubeUrl: youtubeUrl.trim() } : {}),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full sm:max-w-2xl bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[95vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 flex-shrink-0">
          <h2 className="text-lg font-black text-zinc-900">
            {initial ? 'Edit Recipe' : 'New Recipe'}
          </h2>
          <button onClick={onCancel} className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 cursor-pointer">
            <X size={15} />
          </button>
        </div>

        {/* Scrollable form */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">

          {/* URL Import */}
          {!initial && (
            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 flex flex-col gap-3">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Import from URL</p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={importUrl}
                  onChange={(e) => { setImportUrl(e.target.value); setImportStatus('idle'); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleImport()}
                  placeholder="Paste a recipe page URL…"
                  className="flex-1 border border-zinc-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={importStatus === 'loading' || !importUrl.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors flex-shrink-0"
                >
                  {importStatus === 'loading'
                    ? <Loader2 size={14} className="animate-spin" />
                    : <Download size={14} />}
                  Import
                </button>
              </div>
              {importStatus === 'ok' && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-700">
                  <CheckCircle2 size={13} />
                  Recipe imported! Review the fields below and adjust as needed.
                </div>
              )}
              {importStatus === 'error' && (
                <div className="flex items-start gap-1.5 text-xs text-red-600">
                  <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                  {importError}
                </div>
              )}
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              {errors.map((e, i) => <p key={i} className="text-sm text-red-700">{e}</p>)}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Recipe Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Thai Green Curry"
              className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>

          {/* Labels */}
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">Meal Type *</label>
            <div className="flex gap-2 flex-wrap">
              {LABEL_OPTIONS.map((opt) => {
                const on = labels.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleLabel(opt.value)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-sm font-semibold transition-all cursor-pointer
                      ${on ? `${opt.bg} ${opt.color} shadow-sm` : 'border-zinc-200 text-zinc-400 hover:border-zinc-300'}`}
                  >
                    {opt.icon} {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cuisine */}
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">Cuisine</label>
            <div className="flex gap-2 flex-wrap">
              {CUISINES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCuisine(cuisine === c ? '' : c)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer
                    ${cuisine === c
                      ? 'bg-zinc-900 border-zinc-900 text-white'
                      : 'border-zinc-200 text-zinc-500 hover:border-zinc-400'
                    }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Numbers row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Prep Time (min)', value: prepMins, set: setPrepMins, min: 1 },
              { label: 'Calories / person', value: calories, set: setCalories, min: 50 },
              { label: 'Serves', value: recipeYield, set: setRecipeYield, min: 1 },
            ].map(({ label, value, set, min }) => (
              <div key={label}>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">{label}</label>
                <input
                  type="number"
                  value={value}
                  min={min}
                  onChange={(e) => set(Math.max(min, parseInt(e.target.value) || min))}
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>
            ))}
          </div>

          {/* Instructions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Instructions *</label>
              <button type="button" onClick={addStep} className="flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-zinc-900 cursor-pointer">
                <Plus size={13} /> Add step
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {instructions.map((step, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="flex-shrink-0 w-6 h-6 mt-2 rounded-full bg-zinc-900 text-white text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <textarea
                    value={step}
                    onChange={(e) => updateStep(i, e.target.value)}
                    placeholder={`Step ${i + 1}…`}
                    rows={2}
                    className="flex-1 border border-zinc-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                  <button type="button" onClick={() => removeStep(i)} className="mt-2 text-zinc-300 hover:text-red-400 cursor-pointer transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Ingredients */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Ingredients *</label>
              <button type="button" onClick={addIngredient} className="flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-zinc-900 cursor-pointer">
                <Plus size={13} /> Add ingredient
              </button>
            </div>
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
                      placeholder="Ingredient"
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
                      placeholder="Unit (cup, g…)"
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
                  <button type="button" onClick={() => removeIngredient(i)} className="text-zinc-300 hover:text-red-400 cursor-pointer transition-colors flex-shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Links (optional) */}
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">Links (optional)</label>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Link size={14} className="text-zinc-400 flex-shrink-0" />
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="Source URL (e.g. https://…)"
                  className="flex-1 border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>
              <div className="flex items-center gap-2">
                <Youtube size={14} className="text-red-400 flex-shrink-0" />
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="YouTube URL (e.g. https://youtube.com/watch?v=…)"
                  className="flex-1 border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>
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
            {initial ? 'Save Changes' : 'Add Recipe'}
          </button>
        </div>
      </div>
    </div>
  );
}
