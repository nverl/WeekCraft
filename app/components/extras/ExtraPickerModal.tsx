'use client';

import { useState } from 'react';
import { X, Search, Plus, Check, ChevronDown } from 'lucide-react';
import type { Extra, ExtraCategory } from '@/app/types';

// ── Category filter tabs ──────────────────────────────────────────────────────

const CATEGORIES: { id: ExtraCategory | 'all'; label: string }[] = [
  { id: 'all',       label: 'All'       },
  { id: 'drink',     label: 'Drinks'    },
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'snack',     label: 'Snacks'    },
  { id: 'other',     label: 'Other'     },
];

// ── Category badge colors ─────────────────────────────────────────────────────

const CAT_COLOR: Record<ExtraCategory, string> = {
  drink:     'bg-sky-100 text-sky-700',
  breakfast: 'bg-amber-100 text-amber-700',
  snack:     'bg-violet-100 text-violet-700',
  other:     'bg-zinc-100 text-zinc-600',
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface ExtraPickerModalProps {
  extras: Extra[];
  selectedIds: Set<string>;
  onToggle: (extra: Extra) => void;
  onAddCustom: (data: { name: string; emoji: string; category: ExtraCategory }) => void;
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ExtraPickerModal({
  extras, selectedIds, onToggle, onAddCustom, onClose,
}: ExtraPickerModalProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<ExtraCategory | 'all'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [openIngId, setOpenIngId] = useState<string | null>(null);

  // Create-form state
  const [newEmoji, setNewEmoji]       = useState('🍴');
  const [newName, setNewName]         = useState('');
  const [newCategory, setNewCategory] = useState<ExtraCategory>('snack');

  const filtered = extras
    .filter((e) => category === 'all' || e.category === category)
    .filter((e) => e.name.toLowerCase().includes(search.toLowerCase()));

  const handleCreate = () => {
    if (!newName.trim()) return;
    onAddCustom({ name: newName.trim(), emoji: newEmoji || '🍴', category: newCategory });
    setNewName('');
    setNewEmoji('🍴');
    setShowCreate(false);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-xl flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 flex-shrink-0">
          <div>
            <h3 className="text-base font-black text-zinc-900">Add extras</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Ingredients are added to your shopping list</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-zinc-100 cursor-pointer transition-colors"
          >
            <X size={18} className="text-zinc-500" />
          </button>
        </div>

        {/* ── Search + category filter ── */}
        <div className="px-5 pt-3 pb-2 border-b border-zinc-100 flex-shrink-0 flex flex-col gap-2">
          <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2">
            <Search size={14} className="text-zinc-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search extras…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="flex-1 bg-transparent text-sm text-zinc-800 outline-none"
            />
          </div>

          {/* Category pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id as ExtraCategory | 'all')}
                className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-all cursor-pointer
                  ${category === cat.id
                    ? 'bg-zinc-900 text-white'
                    : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                  }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── List ── */}
        <div className="flex-1 overflow-y-auto px-3 py-2">

          {filtered.map((extra) => {
            const selected = selectedIds.has(extra.id);
            const isIngOpen = openIngId === extra.id;

            return (
              <div
                key={extra.id}
                className={`group rounded-2xl transition-colors
                  ${selected ? 'bg-zinc-50' : 'hover:bg-zinc-50'}`}
              >
                {/* Main row */}
                <div className="flex items-center gap-3 px-3 py-3">
                  {/* Emoji */}
                  <span className="text-2xl flex-shrink-0 w-9 text-center">{extra.emoji}</span>

                  {/* Info — click to select */}
                  <button
                    onClick={() => onToggle(extra)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-900">{extra.name}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${CAT_COLOR[extra.category]}`}>
                        {extra.category.charAt(0).toUpperCase() + extra.category.slice(1)}
                      </span>
                    </div>
                    {extra.ingredients.length > 0 && (
                      <p className="text-xs text-zinc-400 mt-0.5 truncate">
                        {extra.ingredients.slice(0, 3).map((i) => i.name).join(', ')}
                        {extra.ingredients.length > 3 && ` +${extra.ingredients.length - 3}`}
                      </p>
                    )}
                    {extra.ingredients.length === 0 && (
                      <p className="text-xs text-zinc-300 mt-0.5 italic">No shopping items</p>
                    )}
                  </button>

                  {/* Expand ingredients button */}
                  {extra.ingredients.length > 0 && (
                    <button
                      onClick={() => setOpenIngId(isIngOpen ? null : extra.id)}
                      className="flex-shrink-0 p-1 rounded-lg text-zinc-300 hover:text-zinc-500 hover:bg-zinc-100 cursor-pointer transition-all"
                      aria-label="Show ingredients"
                    >
                      <ChevronDown size={13} className={`transition-transform ${isIngOpen ? 'rotate-180' : ''}`} />
                    </button>
                  )}

                  {/* Checkbox */}
                  <button
                    onClick={() => onToggle(extra)}
                    className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer
                      ${selected ? 'bg-zinc-900 border-zinc-900' : 'border-zinc-300'}`}
                    aria-label={selected ? `Remove ${extra.name}` : `Add ${extra.name}`}
                  >
                    {selected && <Check size={10} strokeWidth={3} className="text-white" />}
                  </button>
                </div>

                {/* Full ingredient list — shown only when expanded */}
                {extra.ingredients.length > 0 && (
                  <div
                    className={`px-12 pb-3 flex-col gap-1
                      ${isIngOpen ? 'flex' : 'hidden'}`}
                  >
                    {extra.ingredients.map((ing) => (
                      <div key={ing.name} className="flex items-baseline gap-2 text-[11px]">
                        <span className="font-semibold text-zinc-500 w-14 text-right flex-shrink-0">
                          {ing.amount} {ing.unit}
                        </span>
                        <span className="text-zinc-400">{ing.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-8 text-sm text-zinc-400">No extras found</div>
          )}

          {/* ── Create custom extra ── */}
          <div className="mt-1 mb-2">
            {!showCreate ? (
              <button
                onClick={() => setShowCreate(true)}
                className="w-full flex items-center gap-2 px-3 py-3 rounded-2xl text-sm font-semibold text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
              >
                <Plus size={15} />
                Create custom extra
              </button>
            ) : (
              <div className="mx-1 p-4 bg-zinc-50 rounded-2xl border border-zinc-200 flex flex-col gap-3">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">New extra</p>

                {/* Emoji + name */}
                <div className="flex gap-2">
                  <input
                    value={newEmoji}
                    onChange={(e) => setNewEmoji(e.target.value)}
                    className="w-12 text-center text-xl border border-zinc-200 rounded-xl py-2 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 flex-shrink-0"
                    maxLength={2}
                    aria-label="Emoji"
                  />
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Name (e.g. Açaí bowl)"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    className="flex-1 border border-zinc-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>

                {/* Category */}
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as ExtraCategory)}
                  className="border border-zinc-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                >
                  <option value="drink">Drink</option>
                  <option value="breakfast">Breakfast</option>
                  <option value="snack">Snack</option>
                  <option value="other">Other</option>
                </select>

                <p className="text-[11px] text-zinc-400">
                  Custom extras appear in your list. Ingredients can be added later from the extras catalog.
                </p>

                {/* Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowCreate(false); setNewName(''); }}
                    className="flex-1 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-500 cursor-pointer hover:bg-zinc-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!newName.trim()}
                    className="flex-1 py-2 rounded-xl bg-zinc-900 text-white text-sm font-semibold cursor-pointer hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
