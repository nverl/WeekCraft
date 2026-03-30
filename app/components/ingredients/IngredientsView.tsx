'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Lock, Search, X, Copy } from 'lucide-react';
import { useIngredientStore } from '@/app/store/ingredientStore';
import type { IngredientEntry } from '@/app/types';

const AISLES = [
  'Baking', 'Bread & Bakery', 'Canned Goods', 'Condiments',
  'Dairy & Eggs', 'Frozen Foods', 'Grains & Pasta', 'Meat & Poultry',
  'Oils & Vinegars', 'Produce', 'Seafood', 'Spices', 'Other',
];

// ── Inline edit / add form ─────────────────────────────────────────────────────

interface IngredientFormProps {
  initial?: IngredientEntry;
  onSave: (data: Omit<IngredientEntry, 'id' | 'isCustom'>) => void;
  onCancel: () => void;
}

function IngredientForm({ initial, onSave, onCancel }: IngredientFormProps) {
  const [name, setName]               = useState(initial?.name        ?? '');
  const [defaultUnit, setDefaultUnit] = useState(initial?.defaultUnit ?? '');
  const [aisle, setAisle]             = useState(initial?.aisle       ?? 'Produce');
  const [error, setError]             = useState('');

  const handleSave = () => {
    if (!name.trim()) { setError('Name is required.'); return; }
    onSave({ name: name.trim(), defaultUnit: defaultUnit.trim() || 'piece', aisle });
  };

  return (
    <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 flex flex-col gap-3">
      <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
        {initial ? 'Edit ingredient' : 'New ingredient'}
      </p>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input
          value={name}
          onChange={(e) => { setName(e.target.value); setError(''); }}
          placeholder="Name *"
          className="border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
        />
        <input
          value={defaultUnit}
          onChange={(e) => setDefaultUnit(e.target.value)}
          placeholder="Default unit (g, piece, cup…)"
          className="border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
        />
        <select
          value={aisle}
          onChange={(e) => setAisle(e.target.value)}
          className="border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
        >
          {AISLES.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-1.5 rounded-xl border border-zinc-200 text-sm text-zinc-500 hover:bg-zinc-100 cursor-pointer transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-1.5 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-700 cursor-pointer transition-colors"
        >
          {initial ? 'Save' : 'Add'}
        </button>
      </div>
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

export default function IngredientsView() {
  const { ingredients, addIngredient, updateIngredient, removeIngredient } = useIngredientStore();

  const [showAddForm, setShowAddForm]         = useState(false);
  const [editingId, setEditingId]             = useState<string | null>(null);
  const [search, setSearch]                   = useState('');
  const [aisleFilter, setAisleFilter]         = useState<string>('All');

  // Derived
  const query = search.trim().toLowerCase();
  const filtered = ingredients.filter((e) => {
    const matchesSearch = !query || e.name.toLowerCase().includes(query);
    const matchesAisle  = aisleFilter === 'All' || e.aisle === aisleFilter;
    return matchesSearch && matchesAisle;
  });

  // Group by aisle for display
  const grouped = filtered.reduce<Record<string, IngredientEntry[]>>((acc, e) => {
    (acc[e.aisle] ??= []).push(e);
    return acc;
  }, {});
  const aisleGroups = Object.keys(grouped).sort();

  const customCount = ingredients.filter((e) => e.isCustom).length;

  const handleAdd = (data: Omit<IngredientEntry, 'id' | 'isCustom'>) => {
    addIngredient(data);
    setShowAddForm(false);
  };

  const handleUpdate = (id: string, data: Omit<IngredientEntry, 'id' | 'isCustom'>) => {
    updateIngredient(id, { ...data, isCustom: true });
    setEditingId(null);
  };

  /** For built-in ingredients: duplicate as a new custom entry instead of editing in place. */
  const handleDuplicateBuiltin = (entry: IngredientEntry) => {
    const { id: _id, isCustom: _ic, ...data } = entry;
    addIngredient({ ...data, name: `${data.name} (copy)` });
  };

  const handleDelete = (id: string) => {
    if (confirm('Remove this ingredient from the catalog?')) removeIngredient(id);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-50">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 px-4 py-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-black text-zinc-900">Ingredients</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {customCount} custom · {ingredients.length - customCount} built-in · used for autocomplete in editors
            </p>
          </div>
          <button
            onClick={() => { setShowAddForm(true); setEditingId(null); }}
            className="flex items-center gap-1.5 bg-zinc-900 text-white px-4 py-2.5 rounded-2xl text-sm font-semibold hover:bg-zinc-700 transition-colors cursor-pointer flex-shrink-0"
          >
            <Plus size={15} /> Add
          </button>
        </div>

        {/* Search + aisle filter */}
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2">
            <Search size={13} className="text-zinc-400 flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ingredients…"
              className="flex-1 bg-transparent text-sm text-zinc-800 outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-zinc-300 hover:text-zinc-600 cursor-pointer">
                <X size={13} />
              </button>
            )}
          </div>
          <select
            value={aisleFilter}
            onChange={(e) => setAisleFilter(e.target.value)}
            className="border border-zinc-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
          >
            <option value="All">All aisles</option>
            {AISLES.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-2xl mx-auto flex flex-col gap-4">

          {/* Add form */}
          {showAddForm && (
            <IngredientForm
              onSave={handleAdd}
              onCancel={() => setShowAddForm(false)}
            />
          )}

          {filtered.length === 0 && !showAddForm && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-400">
              <p className="text-sm">No ingredients match your search.</p>
            </div>
          )}

          {/* Aisle groups */}
          {aisleGroups.map((aisle) => (
            <section key={aisle}>
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                {aisle} ({grouped[aisle].length})
              </h3>
              <div className="bg-white border border-zinc-200 rounded-2xl divide-y divide-zinc-100 overflow-hidden">
                {grouped[aisle].map((entry) => (
                  <div key={entry.id}>
                    {editingId === entry.id ? (
                      <div className="p-3">
                        <IngredientForm
                          initial={entry}
                          onSave={(data) => handleUpdate(entry.id, data)}
                          onCancel={() => setEditingId(null)}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 transition-colors">
                        {/* Name + unit */}
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-semibold text-zinc-800">{entry.name}</span>
                          <span className="text-xs text-zinc-400 ml-2">{entry.defaultUnit}</span>
                        </div>

                        {/* Built-in badge */}
                        {!entry.isCustom && (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full flex-shrink-0">
                            <Lock size={9} /> Built-in
                          </span>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {entry.isCustom ? (
                            <button
                              onClick={() => { setEditingId(entry.id); setShowAddForm(false); }}
                              className="text-zinc-400 hover:text-zinc-900 cursor-pointer transition-colors"
                              title="Edit"
                            >
                              <Pencil size={13} />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDuplicateBuiltin(entry)}
                              className="flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-zinc-900 cursor-pointer transition-colors"
                              title="Duplicate as custom"
                            >
                              <Copy size={12} /> Duplicate
                            </button>
                          )}
                          {entry.isCustom && (
                            <button
                              onClick={() => handleDelete(entry.id)}
                              className="text-zinc-300 hover:text-red-500 cursor-pointer transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
