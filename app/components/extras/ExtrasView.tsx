'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Lock, ShoppingBag, Copy } from 'lucide-react';
import { useExtrasStore } from '@/app/store/extrasStore';
import ExtraEditor from './ExtraEditor';
import type { Extra, ExtraCategory } from '@/app/types';

// ── Category badge colours ────────────────────────────────────────────────────

const CAT_COLOR: Record<ExtraCategory, { bg: string; text: string; label: string }> = {
  drink:     { bg: 'bg-sky-100',    text: 'text-sky-700',    label: 'Drink'     },
  breakfast: { bg: 'bg-amber-100',  text: 'text-amber-700',  label: 'Breakfast' },
  snack:     { bg: 'bg-violet-100', text: 'text-violet-700', label: 'Snack'     },
  other:     { bg: 'bg-zinc-100',   text: 'text-zinc-600',   label: 'Other'     },
};

// ── Extra card ────────────────────────────────────────────────────────────────

interface ExtraCardProps {
  extra: Extra;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function ExtraCard({ extra, onEdit, onDuplicate, onDelete }: ExtraCardProps) {
  const cat = CAT_COLOR[extra.category];
  const nonStaple = extra.ingredients.filter((i) => !i.isStaple);

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-4 hover:border-zinc-300 transition-colors">
      {/* Top row: emoji + name + badges */}
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl flex-shrink-0 leading-none mt-0.5">{extra.emoji}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-zinc-900 text-sm leading-tight mb-1.5">{extra.name}</h3>
          <div className="flex flex-wrap gap-1.5">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cat.bg} ${cat.text}`}>
              {cat.label}
            </span>
            {!extra.isCustom && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-500">
                <Lock size={10} /> Built-in
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Ingredient preview */}
      {extra.ingredients.length > 0 ? (
        <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-3">
          <ShoppingBag size={11} className="flex-shrink-0" />
          <span className="truncate">
            {extra.ingredients.slice(0, 3).map((i) => i.name).join(', ')}
            {extra.ingredients.length > 3 && ` +${extra.ingredients.length - 3} more`}
          </span>
        </div>
      ) : (
        <p className="text-xs text-zinc-300 italic mb-3">No shopping items</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-400">
          {nonStaple.length} item{nonStaple.length !== 1 ? 's' : ''}
        </p>
        <div className="flex gap-3">
          {extra.isCustom ? (
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 cursor-pointer transition-colors"
            >
              <Pencil size={12} /> Edit
            </button>
          ) : (
            <button
              onClick={onDuplicate}
              className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 cursor-pointer transition-colors"
            >
              <Copy size={12} /> Duplicate & edit
            </button>
          )}
          {extra.isCustom && (
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-red-500 cursor-pointer transition-colors"
            >
              <Trash2 size={12} /> Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

export default function ExtrasView() {
  const { extras, addExtra, updateExtra, removeExtra } = useExtrasStore();

  const [editorOpen, setEditorOpen]   = useState(false);
  const [editingExtra, setEditingExtra] = useState<Extra | undefined>(undefined);

  const [duplicating, setDuplicating] = useState(false);

  const openAdd  = () => { setEditingExtra(undefined); setDuplicating(false); setEditorOpen(true); };
  const openEdit = (e: Extra) => { setEditingExtra(e); setDuplicating(false); setEditorOpen(true); };
  /** Pre-fill editor with built-in data; on save creates a new custom extra. */
  const openDuplicate = (e: Extra) => { setEditingExtra(e); setDuplicating(true); setEditorOpen(true); };
  const closeEditor = () => { setEditorOpen(false); setEditingExtra(undefined); setDuplicating(false); };

  const handleSave = (data: Omit<Extra, 'id' | 'isCustom'>) => {
    if (editingExtra && !duplicating) {
      updateExtra(editingExtra.id, { ...data, isCustom: true });
    } else {
      addExtra(data);
    }
    closeEditor();
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this extra?')) removeExtra(id);
  };

  const customExtras = extras.filter((e) => e.isCustom);
  const seedExtras   = extras.filter((e) => !e.isCustom);

  return (
    <div className="flex flex-col h-full bg-zinc-50">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 px-4 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-lg font-black text-zinc-900">Extras</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            {customExtras.length} custom · {seedExtras.length} built-in
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 bg-zinc-900 text-white px-4 py-2.5 rounded-2xl text-sm font-semibold hover:bg-zinc-700 transition-colors cursor-pointer"
        >
          <Plus size={15} /> Add Extra
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-2xl mx-auto flex flex-col gap-4">

          {/* My Extras */}
          {customExtras.length > 0 && (
            <section>
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                My Extras ({customExtras.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {customExtras.map((e) => (
                  <ExtraCard
                    key={e.id}
                    extra={e}
                    onEdit={() => openEdit(e)}
                    onDuplicate={() => openDuplicate(e)}
                    onDelete={() => handleDelete(e.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {customExtras.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mb-3 text-2xl">
                🥤
              </div>
              <p className="text-sm font-semibold text-zinc-700 mb-1">No custom extras yet</p>
              <p className="text-xs text-zinc-400 mb-4">
                Add drinks, snacks, or breakfast items to include in your shopping list.
              </p>
              <button
                onClick={openAdd}
                className="px-5 py-2.5 bg-zinc-900 text-white rounded-2xl text-sm font-semibold hover:bg-zinc-700 cursor-pointer transition-colors"
              >
                Add your first extra
              </button>
            </div>
          )}

          {/* Built-in */}
          <section>
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Built-in ({seedExtras.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {seedExtras.map((e) => (
                <ExtraCard
                  key={e.id}
                  extra={e}
                  onEdit={() => openEdit(e)}
                  onDuplicate={() => openDuplicate(e)}
                  onDelete={() => handleDelete(e.id)}
                />
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Editor modal */}
      {editorOpen && (
        <ExtraEditor
          initial={editingExtra}
          onSave={handleSave}
          onCancel={closeEditor}
        />
      )}
    </div>
  );
}
