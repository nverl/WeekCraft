'use client';

import { useState, useEffect } from 'react';
import {
  ShoppingCart, Check, ChevronDown, ChevronUp,
  SlidersHorizontal, Package, ListTodo, Copy, CheckCheck,
} from 'lucide-react';
import { useShoppingStore } from '@/app/store/shoppingStore';
import { useWeekPlanStore } from '@/app/store/weekPlanStore';
import { useExtrasStore } from '@/app/store/extrasStore';
import { formatWeekRange } from '@/app/lib/weekUtils';
import type { Extra, ShoppingItem } from '@/app/types';

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
              key={item.name}
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

// ── ICS / Reminders export helpers ───────────────────────────────────────────

interface ExportItem { name: string; scaledAmount: number; unit: string }

function escapeIcal(str: string): string {
  return str.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
}

function buildICS(items: ExportItem[]): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const todos = items.map((item) => {
    const uid = Math.random().toString(36).slice(2, 10) + '@kitchenflow';
    const title = escapeIcal(`${item.name} — ${item.scaledAmount} ${item.unit}`);
    return ['BEGIN:VTODO', `UID:${uid}`, `DTSTAMP:${stamp}`, `SUMMARY:${title}`, 'END:VTODO'].join('\r\n');
  });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//KitchenFlow//Shopping List//EN', ...todos, 'END:VCALENDAR'].join('\r\n');
}

function downloadICS(items: ExportItem[]) {
  const content = buildICS(items);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'shopping-list.ics';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildPlainText(items: ExportItem[]): string {
  return items.map((i) => `• ${i.name} — ${i.scaledAmount} ${i.unit}`).join('\n');
}

// ── Main ShoppingList component ───────────────────────────────────────────────

export default function ShoppingList() {
  const { items, showStaples, togglePantry, toggleShowStaples, rebuildMultiList } = useShoppingStore();
  const { weeks, selectedWeeksForShopping, toggleWeekForShopping, setAllWeeksForShopping } = useWeekPlanStore();
  const { extras } = useExtrasStore();

  const [copied, setCopied] = useState(false);

  const plannedWeekStarts = Object.keys(weeks).sort();
  const hasPlans = plannedWeekStarts.length > 0;

  // Rebuild shopping list whenever week selection, week data, or extras change
  useEffect(() => {
    const selectedPlans = selectedWeeksForShopping
      .filter((ws) => weeks[ws])
      .map((ws) => weeks[ws].days);

    // Collect extras from all selected weeks (de-duped by id)
    const extrasMap = new Map(extras.map((e) => [e.id, e]));
    const seenExtraIds = new Set<string>();
    const weekExtras: Extra[] = [];
    for (const ws of selectedWeeksForShopping) {
      if (!weeks[ws]) continue;
      for (const id of weeks[ws].selectedExtras ?? []) {
        if (!seenExtraIds.has(id) && extrasMap.has(id)) {
          seenExtraIds.add(id);
          weekExtras.push(extrasMap.get(id)!);
        }
      }
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

  // Items to export: everything not yet in pantry (all items, including hidden staples)
  const exportItems = items.filter((i) => !i.inPantry);

  const handleCopy = () => {
    navigator.clipboard.writeText(buildPlainText(exportItems)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-col h-full bg-zinc-50">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 px-4 py-4 flex-shrink-0">

        {/* Week selector */}
        {hasPlans && (
          <div className="mb-3 pb-3 border-b border-zinc-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Weeks to include</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setAllWeeksForShopping(plannedWeekStarts)}
                  className="text-xs text-zinc-400 hover:text-zinc-700 cursor-pointer transition-colors"
                >
                  All
                </button>
                <span className="text-zinc-300">·</span>
                <button
                  onClick={() => setAllWeeksForShopping([])}
                  className="text-xs text-zinc-400 hover:text-zinc-700 cursor-pointer transition-colors"
                >
                  None
                </button>
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
                      ${checked
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
                      }`}
                  >
                    {checked && <Check size={9} strokeWidth={3} />}
                    {formatWeekRange(ws)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-black text-zinc-900">Shopping List</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {checkedItems} of {totalItems} items ready
            </p>
          </div>
          <div className="flex items-center gap-2">
            {exportItems.length > 0 && (
              <>
                <button
                  onClick={() => downloadICS(exportItems)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400 transition-all cursor-pointer"
                  title="Download .ics — open on Mac or iPhone to import into Reminders"
                >
                  <ListTodo size={12} />
                  Reminders
                </button>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400 transition-all cursor-pointer"
                  title="Copy list as plain text"
                >
                  {copied ? <CheckCheck size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </>
            )}
            <button
              onClick={toggleShowStaples}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition-all cursor-pointer
                ${showStaples
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
                }`}
            >
              <SlidersHorizontal size={12} />
              {showStaples ? 'Hide staples' : 'Show staples'}
            </button>
          </div>
        </div>

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
          <div className="flex flex-col items-center justify-center h-48 text-zinc-400">
            <ShoppingCart size={32} className="mb-3 opacity-40" />
            <p className="text-sm">Plan a week first to build your shopping list.</p>
          </div>
        ) : selectedWeeksForShopping.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-400">
            <ShoppingCart size={32} className="mb-3 opacity-40" />
            <p className="text-sm">Select at least one week above.</p>
          </div>
        ) : totalItems === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-400">
            <ShoppingCart size={32} className="mb-3 opacity-40" />
            <p className="text-sm">Your shopping list is empty.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-w-lg mx-auto">
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
                      key={item.name}
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
          </div>
        )}
      </div>

    </div>
  );
}
