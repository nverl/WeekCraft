'use client';

import { useState, useEffect, useRef } from 'react';
import {
  ShoppingCart, Check, ChevronDown, ChevronUp,
  SlidersHorizontal, Package, ListTodo, Copy, CheckCheck, MoreHorizontal,
  Plus, X, ShoppingBag,
} from 'lucide-react';
import { useShoppingStore, type ExtraWithQty } from '@/app/store/shoppingStore';
import { useWeekPlanStore } from '@/app/store/weekPlanStore';
import { useExtrasStore } from '@/app/store/extrasStore';
import { useHouseholdStore } from '@/app/store/householdStore';
import { useCustomShoppingStore } from '@/app/store/customShoppingStore';
import { formatWeekRange, getWeekStart, normalizeSelectedExtra } from '@/app/lib/weekUtils';
import { downloadICS, buildPlainText } from '@/app/lib/ical';
import type { ShoppingItem } from '@/app/types';

// ── Common household item suggestions ─────────────────────────────────────────

const SUGGESTIONS = [
  'Soap', 'Shampoo', 'Conditioner', 'Toilet paper', 'Paper towels',
  'Toothpaste', 'Dish soap', 'Laundry detergent', 'Cleaning spray',
  'Trash bags', 'Aluminum foil', 'Plastic wrap', 'Batteries',
  'Hand soap', 'Sponges', 'Fabric softener', 'Deodorant',
  'Shower gel', 'Dishwasher tablets', 'Bleach',
];

// ── Aisle group ───────────────────────────────────────────────────────────────

function groupByAisle(items: ShoppingItem[]): Record<string, ShoppingItem[]> {
  return items.reduce<Record<string, ShoppingItem[]>>((acc, item) => {
    (acc[item.aisle] ??= []).push(item);
    return acc;
  }, {});
}

interface AisleGroupProps {
  aisle: string;
  items: ShoppingItem[];
  onToggle: (name: string) => void;
}

function AisleGroup({ aisle, items, onToggle }: AisleGroupProps) {
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
        {collapsed ? <ChevronDown size={15} className="text-zinc-400" /> : <ChevronUp size={15} className="text-zinc-400" />}
      </button>

      {!collapsed && (
        <div className="divide-y divide-zinc-100">
          {items.map((item) => (
            <label
              key={`${item.name}__${item.unit}__${item.aisle}`}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-zinc-50 transition-colors ${item.inPantry ? 'opacity-50' : ''}`}
            >
              <div
                onClick={() => onToggle(item.name)}
                className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all
                  ${item.inPantry
                    ? 'bg-emerald-500 border-emerald-500'
                    : 'border-zinc-300 hover:border-zinc-500'
                  }`}
              >
                {item.inPantry && <Check size={11} strokeWidth={3} className="text-white" />}
              </div>
              <span className={`flex-1 text-sm ${item.inPantry ? 'line-through text-zinc-400' : 'text-zinc-700'}`}>
                {item.name}
              </span>
              <span className="text-sm font-semibold text-zinc-500 text-right">
                {item.scaledAmount} {item.unit}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Other section ─────────────────────────────────────────────────────────────

function OtherSection({ scope }: { scope: string }) {
  const { items, addItem, toggleItem, removeItem } = useCustomShoppingStore();
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const queryTrimmed = query.trim();
  const queryLower = queryTrimmed.toLowerCase();

  // Filter suggestions: not already added, matches query
  const addedNames = new Set(items.map((i) => i.name.toLowerCase()));
  const filteredSuggestions = SUGGESTIONS.filter(
    (s) => !addedNames.has(s.toLowerCase()) && s.toLowerCase().includes(queryLower)
  );

  // Show "Add [query]" if typed text isn't in suggestions and not already added
  const canAddCustom =
    queryTrimmed.length > 0 &&
    !addedNames.has(queryLower) &&
    !SUGGESTIONS.some((s) => s.toLowerCase() === queryLower);

  const handleAdd = async (name: string) => {
    if (!name.trim()) return;
    await addItem(name.trim(), scope);
    setQuery('');
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && queryTrimmed) {
      handleAdd(queryTrimmed);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  const needItems = items.filter((i) => !i.inCart);
  const doneItems = items.filter((i) => i.inCart);
  // Quick-add chips: suggestions not yet added, capped at 8 visible
  const quickChips = SUGGESTIONS.filter((s) => !addedNames.has(s.toLowerCase())).slice(0, 8);

  return (
    <div className="mt-2">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-2">
        <ShoppingBag size={13} className="text-zinc-400" />
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
          Other
        </span>
        {items.length > 0 && (
          <span className="text-xs bg-zinc-100 text-zinc-500 font-semibold px-1.5 py-0.5 rounded-full">
            {items.filter((i) => i.inCart).length}/{items.length}
          </span>
        )}
      </div>

      {/* Add input */}
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
            onKeyDown={handleKeyDown}
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

        {/* Dropdown suggestions */}
        {showSuggestions && (filteredSuggestions.length > 0 || canAddCustom) && (
          <div className="divide-y divide-zinc-50 max-h-48 overflow-y-auto">
            {filteredSuggestions.slice(0, 6).map((s) => (
              <button
                key={s}
                onMouseDown={(e) => { e.preventDefault(); handleAdd(s); }}
                className="w-full text-left px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 cursor-pointer flex items-center gap-2"
              >
                <Plus size={12} className="text-zinc-300" />
                {s}
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

        {/* Quick-add chips (shown when input is not focused / empty) */}
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

        {/* Items to get */}
        {needItems.length > 0 && (
          <div className="divide-y divide-zinc-100">
            {needItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <button
                  onClick={() => toggleItem(item.id, true, scope)}
                  className="flex-shrink-0 w-5 h-5 rounded-md border-2 border-zinc-300 hover:border-zinc-500 flex items-center justify-center transition-all cursor-pointer"
                />
                <span className="flex-1 text-sm text-zinc-700">{item.name}</span>
                <button
                  onClick={() => removeItem(item.id, scope)}
                  className="text-zinc-300 hover:text-zinc-500 transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Done items */}
        {doneItems.length > 0 && (
          <div className="divide-y divide-zinc-100 border-t border-zinc-100">
            {doneItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3 opacity-50">
                <button
                  onClick={() => toggleItem(item.id, false, scope)}
                  className="flex-shrink-0 w-5 h-5 rounded-md border-2 bg-emerald-500 border-emerald-500 flex items-center justify-center cursor-pointer"
                >
                  <Check size={11} strokeWidth={3} className="text-white" />
                </button>
                <span className="flex-1 text-sm line-through text-zinc-400">{item.name}</span>
                <button
                  onClick={() => removeItem(item.id, scope)}
                  className="text-zinc-300 hover:text-zinc-500 transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {items.length === 0 && !showSuggestions && !queryTrimmed && (
          <p className="px-4 py-3 text-xs text-zinc-400">
            Tap a suggestion or type to add household items like soap, toilet paper…
          </p>
        )}
      </div>
    </div>
  );
}

// ── ICS / Reminders export helpers live in app/lib/ical.ts ───────────────────

// ── Main ShoppingList component ───────────────────────────────────────────────

export default function ShoppingList() {
  const { items, showStaples, togglePantry, toggleShowStaples, rebuildMultiList } = useShoppingStore();
  const { weeks, selectedWeeksForShopping, toggleWeekForShopping, setAllWeeksForShopping } = useWeekPlanStore();
  const { extras } = useExtrasStore();
  const { activeScope } = useHouseholdStore();
  const { items: customItems } = useCustomShoppingStore();

  const [copied, setCopied] = useState(false);
  const [weeksExpanded, setWeeksExpanded] = useState(false);
  const [actionsExpanded, setActionsExpanded] = useState(false);

  // Only show current week + up to 4 future weeks (5 total); discard past weeks
  const todayMonday = getWeekStart(new Date()).toISOString().slice(0, 10);

  const plannedWeekStarts = Object.keys(weeks)
    .sort()
    .filter((ws) => ws >= todayMonday)
    .slice(0, 5);
  const hasPlans = plannedWeekStarts.length > 0;

  // Rebuild shopping list whenever week selection, week data, or extras change
  useEffect(() => {
    const selectedPlans = selectedWeeksForShopping
      .filter((ws) => weeks[ws])
      .map((ws) => weeks[ws].days);

    // Collect extras from all selected weeks — aggregate qty per extra id
    const extrasMap = new Map(extras.map((e) => [e.id, e]));
    const qtyById = new Map<string, number>();
    for (const ws of selectedWeeksForShopping) {
      if (!weeks[ws]) continue;
      for (const sel of weeks[ws].selectedExtras ?? []) {
        const { id, qty } = normalizeSelectedExtra(sel);
        qtyById.set(id, (qtyById.get(id) ?? 0) + qty);
      }
    }
    const weekExtras: ExtraWithQty[] = [];
    for (const [id, qty] of qtyById) {
      const extra = extrasMap.get(id);
      if (extra) weekExtras.push({ extra, qty });
    }

    rebuildMultiList(selectedPlans, weekExtras);
  }, [selectedWeeksForShopping, weeks, extras]); // eslint-disable-line react-hooks/exhaustive-deps

  const displayItems = showStaples ? items : items.filter((i) => !i.isStaple);
  const needItems = displayItems.filter((i) => !i.inPantry);
  const pantryItems = displayItems.filter((i) => i.inPantry);
  const aisleGroups = groupByAisle(needItems);
  const aisles = Object.keys(aisleGroups).sort();

  const totalItems = displayItems.length;
  const checkedItems = displayItems.filter((i) => i.inPantry).length;
  const progress = totalItems > 0 ? (checkedItems / totalItems) * 100 : 0;

  // Items to export: everything not yet in pantry + unchecked custom items
  const exportItems = items.filter((i) => !i.inPantry);
  const exportCustomItems = customItems
    .filter((i) => !i.inCart)
    .map((i) => ({ name: i.name, scaledAmount: 1 as unknown as number, unit: '' }));

  const handleCopy = () => {
    const recipeText = buildPlainText(exportItems);
    const customText = exportCustomItems.map((i) => i.name).join('\n');
    const fullText = [recipeText, customText].filter(Boolean).join('\n');
    navigator.clipboard.writeText(fullText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-col h-full bg-zinc-50">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 px-4 py-4 flex-shrink-0">

          {/* Compact header row */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-lg font-black text-zinc-900">Shopping List</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {checkedItems} of {totalItems} items ready
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Week selector pill */}
            {hasPlans && (
              <button
                onClick={() => setWeeksExpanded((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400 transition-all cursor-pointer"
              >
                {selectedWeeksForShopping.length === plannedWeekStarts.length
                  ? 'All weeks'
                  : selectedWeeksForShopping.length === 0
                  ? 'No weeks'
                  : `${selectedWeeksForShopping.length} week${selectedWeeksForShopping.length !== 1 ? 's' : ''}`}
                <ChevronDown size={11} className={`text-zinc-400 transition-transform ${weeksExpanded ? 'rotate-180' : ''}`} />
              </button>
            )}
            {/* Actions overflow */}
            <button
              onClick={() => setActionsExpanded((v) => !v)}
              className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-2 rounded-xl border transition-all cursor-pointer
                ${actionsExpanded ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'}`}
            >
              <MoreHorizontal size={14} />
            </button>
          </div>
        </div>

        {/* Expandable week selector */}
        {hasPlans && weeksExpanded && (
          <div className="mb-2 p-3 bg-zinc-50 rounded-2xl border border-zinc-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Weeks to include</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setAllWeeksForShopping(plannedWeekStarts)} className="text-xs text-zinc-400 hover:text-zinc-700 cursor-pointer transition-colors">All</button>
                <span className="text-zinc-300">·</span>
                <button onClick={() => setAllWeeksForShopping([])} className="text-xs text-zinc-400 hover:text-zinc-700 cursor-pointer transition-colors">None</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {plannedWeekStarts.map((ws) => {
                const checked = selectedWeeksForShopping.includes(ws);
                return (
                  <button
                    key={ws}
                    onClick={() => toggleWeekForShopping(ws)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer
                      ${checked ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'}`}
                  >
                    {checked && <Check size={9} strokeWidth={3} />}
                    {formatWeekRange(ws)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Expandable actions */}
        {actionsExpanded && (
          <div className="mb-2 flex flex-wrap gap-2 p-3 bg-zinc-50 rounded-2xl border border-zinc-100">
            {exportItems.length > 0 && (
              <>
                <button
                  onClick={() => downloadICS(exportItems)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400 transition-all cursor-pointer"
                >
                  <ListTodo size={12} />
                  Reminders
                </button>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400 transition-all cursor-pointer"
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
              </>
            )}
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

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {!hasPlans ? (
          <div className="flex flex-col gap-3 max-w-lg mx-auto">
            <div className="flex flex-col items-center justify-center h-32 text-zinc-400">
              <ShoppingCart size={32} className="mb-3 opacity-40" />
              <p className="text-sm">Plan a week first to build your shopping list.</p>
            </div>
            <OtherSection scope={activeScope} />
          </div>
        ) : selectedWeeksForShopping.length === 0 ? (
          <div className="flex flex-col gap-3 max-w-lg mx-auto">
            <div className="flex flex-col items-center justify-center h-32 text-zinc-400">
              <ShoppingCart size={32} className="mb-3 opacity-40" />
              <p className="text-sm">Select at least one week above.</p>
            </div>
            <OtherSection scope={activeScope} />
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-w-lg mx-auto">
            {totalItems === 0 && (
              <div className="flex flex-col items-center justify-center h-32 text-zinc-400 text-center px-6">
                <ShoppingCart size={32} className="mb-3 opacity-40" />
                <p className="text-sm font-semibold text-zinc-600">Nothing left to buy!</p>
                <p className="text-xs text-zinc-400 mt-1">
                  {checkedItems > 0
                    ? `All ${checkedItems} item${checkedItems !== 1 ? 's' : ''} are already in your pantry.`
                    : 'The selected weeks have no recipes with ingredients yet.'}
                </p>
              </div>
            )}

            {/* Need to buy groups */}
            {aisles.map((aisle) => (
              <AisleGroup
                key={aisle}
                aisle={aisle}
                items={aisleGroups[aisle]}
                onToggle={togglePantry}
              />
            ))}

            {/* In Pantry section */}
            {pantryItems.length > 0 && (
              <div className="mt-2">
                <div className="flex items-center gap-2 mb-2">
                  <Package size={13} className="text-zinc-400" />
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    In Pantry ({pantryItems.length})
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
                      <span className="text-sm font-semibold text-zinc-400 text-right">
                        {item.scaledAmount} {item.unit}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Other section — always visible */}
            <OtherSection scope={activeScope} />
          </div>
        )}
      </div>

    </div>
  );
}
