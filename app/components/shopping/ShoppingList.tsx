'use client';

import { useState, useEffect, useRef } from 'react';
import {
  ShoppingCart, Check, ChevronDown, ChevronUp,
  SlidersHorizontal, Package, Copy, CheckCheck, ListTodo,
  Plus, X, ShoppingBag, ChevronLeft, ChevronRight, Search,
} from 'lucide-react';
import { useShoppingStore } from '@/app/store/shoppingStore';
import type { ExtraWithQty } from '@/app/store/shoppingStore';
import { useWeekPlanStore } from '@/app/store/weekPlanStore';
import { useExtrasStore } from '@/app/store/extrasStore';
import { useHouseholdStore } from '@/app/store/householdStore';
import { useCustomShoppingStore } from '@/app/store/customShoppingStore';
import { useIngredientStore } from '@/app/store/ingredientStore';
import { formatWeekRange, getWeekStart, normalizeSelectedExtra } from '@/app/lib/weekUtils';
import { downloadICS, buildPlainText } from '@/app/lib/ical';
import type { ShoppingItem, ExtraShoppingIngredient } from '@/app/types';

// ── Household item suggestions ─────────────────────────────────────────────────

const SUGGESTIONS = [
  'Soap', 'Shampoo', 'Conditioner', 'Toilet paper', 'Paper towels',
  'Toothpaste', 'Dish soap', 'Laundry detergent', 'Cleaning spray',
  'Trash bags', 'Aluminum foil', 'Plastic wrap', 'Batteries',
  'Hand soap', 'Sponges', 'Fabric softener', 'Deodorant',
  'Shower gel', 'Dishwasher tablets', 'Bleach',
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function groupByAisle(items: ShoppingItem[]): Record<string, ShoppingItem[]> {
  return items.reduce<Record<string, ShoppingItem[]>>((acc, item) => {
    (acc[item.aisle] ??= []).push(item);
    return acc;
  }, {});
}

// ── Aisle group ────────────────────────────────────────────────────────────────

function AisleGroup({ aisle, items, onToggle, extraIds, onRemoveExtra }: {
  aisle: string;
  items: ShoppingItem[];
  onToggle: (name: string) => void;
  /** recipeIds that start with "extra-" are manually added — show remove button */
  extraIds: Set<string>;
  onRemoveExtra: (recipeId: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const doneCount = items.filter((i) => i.inPantry).length;

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-zinc-50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-zinc-800">{aisle}</span>
          {doneCount > 0 && (
            <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">
              {doneCount}/{items.length}
            </span>
          )}
        </div>
        {collapsed
          ? <ChevronDown size={15} className="text-zinc-400" />
          : <ChevronUp size={15} className="text-zinc-400" />}
      </button>

      {!collapsed && (
        <div className="divide-y divide-zinc-100">
          {items.map((item) => {
            const isExtra = item.recipeId?.startsWith('extra-');
            return (
              <label
                key={`${item.name}__${item.unit}__${item.aisle}`}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-zinc-50 transition-colors ${item.inPantry ? 'opacity-50' : ''}`}
              >
                <div
                  onClick={() => onToggle(item.name)}
                  className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all
                    ${item.inPantry ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-300 hover:border-zinc-500'}`}
                >
                  {item.inPantry && <Check size={11} strokeWidth={3} className="text-white" />}
                </div>
                <span className={`flex-1 text-sm ${item.inPantry ? 'line-through text-zinc-400' : 'text-zinc-700'}`}>
                  {item.name}
                  {isExtra && (
                    <span className="ml-1.5 text-[10px] font-semibold text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded-full">added</span>
                  )}
                </span>
                <span className="text-sm font-semibold text-zinc-500">
                  {item.scaledAmount} {item.unit}
                </span>
                {isExtra && (
                  <button
                    onClick={(e) => { e.preventDefault(); onRemoveExtra(item.recipeId!); }}
                    className="ml-1 text-zinc-300 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                )}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Ingredient picker (add extra ingredients from the ingredient list) ──────────

function IngredientPicker({ weekStart }: { weekStart: string }) {
  const { ingredients } = useIngredientStore();
  const { addExtraIngredient, removeExtraIngredient, weeks } = useWeekPlanStore();

  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [pending, setPending] = useState<{ name: string; unit: string; aisle: string } | null>(null);
  const [amount, setAmount] = useState('1');
  const inputRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  const week = weeks[weekStart];
  const added = week?.extraIngredients ?? [];

  const queryLower = query.trim().toLowerCase();
  const addedNames = new Set(added.map((e) => e.name.toLowerCase()));

  const filtered = queryLower
    ? ingredients
        .filter((ing) => ing.name.toLowerCase().includes(queryLower) && !addedNames.has(ing.name.toLowerCase()))
        .slice(0, 8)
    : [];

  const handleSelect = (ing: { name: string; defaultUnit: string; aisle: string }) => {
    setPending({ name: ing.name, unit: ing.defaultUnit, aisle: ing.aisle });
    setAmount('1');
    setQuery('');
    setShowDropdown(false);
    setTimeout(() => amountRef.current?.focus(), 50);
  };

  const handleConfirm = () => {
    if (!pending) return;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return;
    const entry: ExtraShoppingIngredient = {
      id: crypto.randomUUID(),
      name: pending.name,
      amount: amt,
      unit: pending.unit,
      aisle: pending.aisle,
    };
    addExtraIngredient(weekStart, entry);
    setPending(null);
    setAmount('1');
    inputRef.current?.focus();
  };

  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 mb-2">
        <Search size={13} className="text-zinc-400" />
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Add ingredients</span>
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-2 px-3 py-2.5">
          <Plus size={14} className="text-zinc-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            onKeyDown={(e) => { if (e.key === 'Escape') { setShowDropdown(false); inputRef.current?.blur(); } }}
            placeholder="Search ingredients to add…"
            className="flex-1 text-sm text-zinc-700 placeholder-zinc-400 outline-none bg-transparent"
          />
        </div>

        {/* Dropdown */}
        {showDropdown && filtered.length > 0 && (
          <div className="border-t border-zinc-100 divide-y divide-zinc-50 max-h-52 overflow-y-auto">
            {filtered.map((ing) => (
              <button
                key={ing.id}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(ing); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 cursor-pointer text-left"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-zinc-700">{ing.name}</span>
                </div>
                <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full flex-shrink-0">
                  {ing.aisle}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Pending confirm: amount input */}
        {pending && (
          <div className="border-t border-zinc-100 px-4 py-3 flex items-center gap-3 bg-zinc-50">
            <span className="flex-1 text-sm font-semibold text-zinc-700">{pending.name}</span>
            <input
              ref={amountRef}
              type="number"
              min="0.1"
              step="0.1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); if (e.key === 'Escape') setPending(null); }}
              className="w-16 text-sm text-right font-semibold text-zinc-700 bg-white border border-zinc-200 rounded-lg px-2 py-1 outline-none focus:border-zinc-400"
            />
            <span className="text-sm text-zinc-500 w-8">{pending.unit}</span>
            <button
              onClick={handleConfirm}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer px-1"
            >
              Add
            </button>
            <button onClick={() => setPending(null)} className="text-zinc-300 hover:text-zinc-500 cursor-pointer">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Added list */}
        {added.length > 0 && (
          <div className="border-t border-zinc-100 divide-y divide-zinc-100">
            {added.map((ing) => (
              <div key={ing.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="flex-1 text-sm text-zinc-600">{ing.name}</span>
                <span className="text-sm font-semibold text-zinc-500">{ing.amount} {ing.unit}</span>
                <button
                  onClick={() => removeExtraIngredient(weekStart, ing.id)}
                  className="text-zinc-300 hover:text-red-400 transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Empty hint */}
        {added.length === 0 && !pending && (
          <p className="px-4 pb-3 text-xs text-zinc-400">
            Search and add any ingredient — it&apos;ll be sorted into the right aisle.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Other section ──────────────────────────────────────────────────────────────

function OtherSection({ scope, weekStart }: { scope: string; weekStart: string }) {
  const { items, loadItems, loadedWeek, addItem, toggleItem, removeItem } = useCustomShoppingStore();
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (weekStart && weekStart !== loadedWeek) {
      loadItems(scope, weekStart);
    }
  }, [weekStart, scope]); // eslint-disable-line react-hooks/exhaustive-deps

  const queryTrimmed = query.trim();
  const queryLower = queryTrimmed.toLowerCase();
  const addedNames = new Set(items.map((i) => i.name.toLowerCase()));

  const filteredSuggestions = SUGGESTIONS.filter(
    (s) => !addedNames.has(s.toLowerCase()) && s.toLowerCase().includes(queryLower)
  );
  const canAddCustom =
    queryTrimmed.length > 0 &&
    !addedNames.has(queryLower) &&
    !SUGGESTIONS.some((s) => s.toLowerCase() === queryLower);

  const handleAdd = async (name: string) => {
    if (!name.trim()) return;
    await addItem(name.trim(), scope, weekStart);
    setQuery('');
    setShowSuggestions(false);
  };

  const needItems = items.filter((i) => !i.inCart);
  const doneItems = items.filter((i) => i.inCart);
  const quickChips = SUGGESTIONS.filter((s) => !addedNames.has(s.toLowerCase())).slice(0, 8);

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 mb-2">
        <ShoppingBag size={13} className="text-zinc-400" />
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Other</span>
        {items.length > 0 && (
          <span className="text-xs bg-zinc-100 text-zinc-500 font-semibold px-1.5 py-0.5 rounded-full">
            {doneItems.length}/{items.length}
          </span>
        )}
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-zinc-100">
          <Plus size={14} className="text-zinc-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && queryTrimmed) handleAdd(queryTrimmed);
              else if (e.key === 'Escape') { setShowSuggestions(false); inputRef.current?.blur(); }
            }}
            placeholder="Add item…"
            className="flex-1 text-sm text-zinc-700 placeholder-zinc-400 outline-none bg-transparent"
          />
          {queryTrimmed && (
            <button
              onMouseDown={(e) => { e.preventDefault(); handleAdd(queryTrimmed); }}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer px-1"
            >
              Add
            </button>
          )}
        </div>

        {showSuggestions && (filteredSuggestions.length > 0 || canAddCustom) && (
          <div className="divide-y divide-zinc-50 max-h-48 overflow-y-auto">
            {filteredSuggestions.slice(0, 6).map((s) => (
              <button
                key={s}
                onMouseDown={(e) => { e.preventDefault(); handleAdd(s); }}
                className="w-full text-left px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 cursor-pointer flex items-center gap-2"
              >
                <Plus size={12} className="text-zinc-300" /> {s}
              </button>
            ))}
            {canAddCustom && (
              <button
                onMouseDown={(e) => { e.preventDefault(); handleAdd(queryTrimmed); }}
                className="w-full text-left px-4 py-2.5 text-sm text-zinc-500 hover:bg-zinc-50 cursor-pointer flex items-center gap-2"
              >
                <Plus size={12} className="text-emerald-500" />
                <span>Add &ldquo;<span className="font-semibold text-zinc-700">{queryTrimmed}</span>&rdquo;</span>
              </button>
            )}
          </div>
        )}

        {!showSuggestions && !queryTrimmed && quickChips.length > 0 && (
          <div className="px-3 py-2.5 flex flex-wrap gap-1.5">
            {quickChips.map((s) => (
              <button
                key={s}
                onClick={() => handleAdd(s)}
                className="text-xs font-medium px-2.5 py-1 rounded-full border border-zinc-200 text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50 transition-all cursor-pointer"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {needItems.length > 0 && (
          <div className="divide-y divide-zinc-100">
            {needItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <button
                  onClick={() => toggleItem(item.id, true, scope)}
                  className="flex-shrink-0 w-5 h-5 rounded-md border-2 border-zinc-300 hover:border-zinc-500 flex items-center justify-center transition-all cursor-pointer"
                />
                <span className="flex-1 text-sm text-zinc-700">{item.name}</span>
                <button onClick={() => removeItem(item.id, scope)} className="text-zinc-300 hover:text-zinc-500 cursor-pointer">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {doneItems.length > 0 && (
          <div className="divide-y divide-zinc-100 border-t border-zinc-100">
            {doneItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3 opacity-50">
                <button
                  onClick={() => toggleItem(item.id, false, scope)}
                  className="flex-shrink-0 w-5 h-5 rounded-md bg-emerald-500 border-2 border-emerald-500 flex items-center justify-center cursor-pointer"
                >
                  <Check size={11} strokeWidth={3} className="text-white" />
                </button>
                <span className="flex-1 text-sm line-through text-zinc-400">{item.name}</span>
                <button onClick={() => removeItem(item.id, scope)} className="text-zinc-300 hover:text-zinc-500 cursor-pointer">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {items.length === 0 && !showSuggestions && !queryTrimmed && (
          <p className="px-4 py-3 text-xs text-zinc-400">
            Tap a suggestion or type to add household items for this week.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ShoppingList() {
  const { items, showStaples, togglePantry, toggleShowStaples, buildForWeek, activeShoppingWeek } = useShoppingStore();
  const { weeks, removeExtraIngredient } = useWeekPlanStore();
  const { extras } = useExtrasStore();
  const { activeScope } = useHouseholdStore();
  const { items: customItems } = useCustomShoppingStore();

  const [copied, setCopied] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const todayMonday = getWeekStart(new Date()).toISOString().slice(0, 10);
  const plannedWeeks = Object.keys(weeks).sort().filter((ws) => ws >= todayMonday).slice(0, 8);
  const hasPlans = plannedWeeks.length > 0;

  const [activeWeek, setActiveWeek] = useState<string | null>(() => {
    if (activeShoppingWeek && weeks[activeShoppingWeek]) return activeShoppingWeek;
    return null;
  });

  useEffect(() => {
    if (!activeWeek && plannedWeeks.length > 0) setActiveWeek(plannedWeeks[0]);
    if (activeWeek && !weeks[activeWeek] && plannedWeeks.length > 0) setActiveWeek(plannedWeeks[0]);
  }, [plannedWeeks.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  // Rebuild when active week, plan data, extras, or extra ingredients change
  useEffect(() => {
    if (!activeWeek || !weeks[activeWeek]) return;

    const plan = weeks[activeWeek].days;
    const extrasMap = new Map(extras.map((e) => [e.id, e]));
    const qtyById = new Map<string, number>();
    for (const sel of weeks[activeWeek].selectedExtras ?? []) {
      const { id, qty } = normalizeSelectedExtra(sel);
      qtyById.set(id, (qtyById.get(id) ?? 0) + qty);
    }
    const weekExtras: ExtraWithQty[] = [];
    for (const [id, qty] of qtyById) {
      const extra = extrasMap.get(id);
      if (extra) weekExtras.push({ extra, qty });
    }

    buildForWeek(activeWeek, plan, weekExtras, weeks[activeWeek].extraIngredients ?? []);
  }, [activeWeek, weeks, extras]); // eslint-disable-line react-hooks/exhaustive-deps

  const displayItems = showStaples ? items : items.filter((i) => !i.isStaple);
  const needItems = displayItems.filter((i) => !i.inPantry);
  const pantryItems = displayItems.filter((i) => i.inPantry);
  const aisleGroups = groupByAisle(needItems);
  const aisles = Object.keys(aisleGroups).sort();

  const totalItems = displayItems.length;
  const checkedItems = pantryItems.length;
  const progress = totalItems > 0 ? (checkedItems / totalItems) * 100 : 0;

  const exportItems = items.filter((i) => !i.inPantry);

  // Extra ingredient IDs (for removal button in aisle group)
  const extraIngredientIds = new Set(
    (activeWeek ? weeks[activeWeek]?.extraIngredients ?? [] : []).map((e) => `extra-${e.id}`)
  );
  const handleRemoveExtra = (recipeId: string) => {
    if (!activeWeek) return;
    const ingId = recipeId.replace('extra-', '');
    removeExtraIngredient(activeWeek, ingId);
  };

  const handleCopy = () => {
    const recipeText = buildPlainText(exportItems);
    const customText = customItems.filter((i) => !i.inCart).map((i) => i.name).join('\n');
    const fullText = [recipeText, customText].filter(Boolean).join('\n');
    navigator.clipboard.writeText(fullText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const weekIndex = activeWeek ? plannedWeeks.indexOf(activeWeek) : -1;
  const canPrev = weekIndex > 0;
  const canNext = weekIndex < plannedWeeks.length - 1;

  return (
    <div className="flex flex-col h-full bg-zinc-50">
      {/* ── Header ── */}
      <div className="bg-white border-b border-zinc-200 px-4 pt-4 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h2 className="text-lg font-black text-zinc-900">Shopping List</h2>
            <p className="text-xs text-zinc-400">
              {hasPlans ? `${checkedItems} of ${totalItems} ingredients ready` : 'Plan a week first'}
            </p>
          </div>
          <button
            onClick={() => setShowActions((v) => !v)}
            className={`text-xs font-semibold px-3 py-2 rounded-xl border transition-all cursor-pointer
              ${showActions ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'}`}
          >
            {showActions ? 'Done' : 'Options'}
          </button>
        </div>

        {showActions && (
          <div className="flex flex-wrap gap-2 py-2 mb-1">
            {exportItems.length > 0 && (
              <button
                onClick={() => downloadICS(exportItems)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400 cursor-pointer"
              >
                <ListTodo size={12} /> Reminders
              </button>
            )}
            <div className="flex flex-col gap-1">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400 cursor-pointer"
              >
                {copied ? <CheckCheck size={12} className="text-emerald-500" /> : <Copy size={12} />}
                {copied ? 'Copied!' : 'Copy list'}
              </button>
              {copied && (
                <p className="text-[10px] text-zinc-400 leading-tight px-1">
                  Open Notes → paste to create a checklist
                </p>
              )}
            </div>
            <button
              onClick={toggleShowStaples}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition-all cursor-pointer
                ${showStaples ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'}`}
            >
              <SlidersHorizontal size={12} />
              {showStaples ? 'Hide staples' : 'Show staples'}
            </button>
          </div>
        )}

        {/* Week switcher */}
        {hasPlans && (
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={() => canPrev && setActiveWeek(plannedWeeks[weekIndex - 1])}
              disabled={!canPrev}
              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 disabled:opacity-20 cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex-1 overflow-x-auto flex gap-1.5 scrollbar-none">
              {plannedWeeks.map((ws) => (
                <button
                  key={ws}
                  onClick={() => setActiveWeek(ws)}
                  className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all cursor-pointer whitespace-nowrap
                    ${activeWeek === ws
                      ? 'bg-zinc-900 text-white border-zinc-900'
                      : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400'}`}
                >
                  {formatWeekRange(ws)}
                </button>
              ))}
            </div>
            <button
              onClick={() => canNext && setActiveWeek(plannedWeeks[weekIndex + 1])}
              disabled={!canNext}
              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 disabled:opacity-20 cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {hasPlans && activeWeek && (
          <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* ── List ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {!hasPlans ? (
          <div className="flex flex-col items-center justify-center h-32 text-zinc-400">
            <ShoppingCart size={32} className="mb-3 opacity-40" />
            <p className="text-sm">Plan a week first to build your shopping list.</p>
          </div>
        ) : !activeWeek ? (
          <div className="flex flex-col items-center justify-center h-32 text-zinc-400">
            <ShoppingCart size={32} className="mb-3 opacity-40" />
            <p className="text-sm">Select a week above.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-w-lg mx-auto">
            {/* ── Ingredient picker at top ── */}
            <IngredientPicker weekStart={activeWeek} />

            {totalItems === 0 && (
              <div className="flex flex-col items-center justify-center h-24 text-zinc-400 text-center px-6">
                <p className="text-sm font-semibold text-zinc-600">
                  {checkedItems > 0 ? 'All done!' : 'No ingredients yet'}
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  {checkedItems > 0
                    ? `All ${checkedItems} items are checked off.`
                    : 'This week has no recipes with ingredients.'}
                </p>
              </div>
            )}

            {/* Aisle groups */}
            {aisles.map((aisle) => (
              <AisleGroup
                key={aisle}
                aisle={aisle}
                items={aisleGroups[aisle]}
                onToggle={togglePantry}
                extraIds={extraIngredientIds}
                onRemoveExtra={handleRemoveExtra}
              />
            ))}

            {/* Got it section */}
            {pantryItems.length > 0 && (
              <div className="mt-2">
                <div className="flex items-center gap-2 mb-2">
                  <Package size={13} className="text-zinc-400" />
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Got it ({pantryItems.length})
                  </span>
                </div>
                <div className="bg-white border border-zinc-200 rounded-2xl divide-y divide-zinc-100">
                  {pantryItems.map((item) => (
                    <label
                      key={`${item.name}__${item.unit}__${item.aisle}`}
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-zinc-50 opacity-50"
                    >
                      <div
                        onClick={() => togglePantry(item.name)}
                        className="flex-shrink-0 w-5 h-5 rounded-md border-2 bg-emerald-500 border-emerald-500 flex items-center justify-center cursor-pointer"
                      >
                        <Check size={11} strokeWidth={3} className="text-white" />
                      </div>
                      <span className="flex-1 text-sm line-through text-zinc-400">{item.name}</span>
                      <span className="text-sm font-semibold text-zinc-400">
                        {item.scaledAmount} {item.unit}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Other section */}
            <OtherSection scope={activeScope} weekStart={activeWeek} />
          </div>
        )}
      </div>
    </div>
  );
}
