'use client';

import { useState } from 'react';
import {
  Plus, Clock, Flame, Leaf, Zap, Pencil, Trash2, Lock,
  Link, Youtube, Star, Search, X, StickyNote, Dumbbell, Shuffle,
} from 'lucide-react';
import { parseISODuration } from '@/app/store/wizardStore';
import { useRecipeStore } from '@/app/store/recipeStore';
import RecipeEditor from './RecipeEditor';
import ExtrasView from '@/app/components/extras/ExtrasView';
import IngredientsView from '@/app/components/ingredients/IngredientsView';
import type { Recipe, DayLabel } from '@/app/types';

// ── Constants ─────────────────────────────────────────────────────────────────

const LABEL_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string; text: string }> = {
  healthy:        { icon: <Leaf size={12} />,     color: 'text-emerald-700', bg: 'bg-emerald-100', text: 'Healthy'      },
  'high-protein': { icon: <Dumbbell size={12} />, color: 'text-violet-700',  bg: 'bg-violet-100',  text: 'High Protein' },
  'low-carb':     { icon: <Zap size={12} />,      color: 'text-sky-700',     bg: 'bg-sky-100',     text: 'Low Carb'     },
  cheat:          { icon: <Flame size={12} />,    color: 'text-orange-700',  bg: 'bg-orange-100',  text: 'Cheat Day'    },
  any:            { icon: <Shuffle size={12} />,  color: 'text-zinc-600',    bg: 'bg-zinc-100',    text: 'Any'          },
};

// ── Recipe card ───────────────────────────────────────────────────────────────

interface RecipeCardProps {
  recipe: Recipe;
  isCustom: boolean;
  isFavourite: boolean;
  note: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleFavourite: () => void;
  onSaveNote: (note: string) => void;
}

function RecipeCard({
  recipe, isCustom, isFavourite, note,
  onEdit, onDelete, onToggleFavourite, onSaveNote,
}: RecipeCardProps) {
  const [editingNote, setEditingNote] = useState(false);
  const [noteVal, setNoteVal]         = useState('');

  const startEdit = () => { setNoteVal(note); setEditingNote(true); };
  const saveNote  = () => { onSaveNote(noteVal); setEditingNote(false); };
  const cancelEdit = () => setEditingNote(false);

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-4 hover:border-zinc-300 transition-colors flex flex-col">
      {/* Top row: labels + favourite */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex flex-wrap gap-1.5">
          {recipe.labels.map((label) => {
            const cfg = LABEL_CONFIG[label];
            return (
              <span key={label} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
                {cfg.icon} {cfg.text}
              </span>
            );
          })}
          {recipe.cuisine && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-500">
              {recipe.cuisine}
            </span>
          )}
          {!isCustom && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-400">
              <Lock size={10} /> Built-in
            </span>
          )}
        </div>
        <button
          onClick={onToggleFavourite}
          title={isFavourite ? 'Remove from favourites' : 'Add to favourites'}
          className="flex-shrink-0 cursor-pointer transition-transform hover:scale-110"
        >
          <Star
            size={16}
            className={isFavourite ? 'fill-amber-400 text-amber-400' : 'text-zinc-200 hover:text-amber-300'}
          />
        </button>
      </div>

      <h3 className="font-bold text-zinc-900 text-sm leading-tight mb-1">{recipe.name}</h3>

      <div className="flex items-center gap-3 text-xs text-zinc-400 mb-3">
        <span className="flex items-center gap-1"><Clock size={11} />{parseISODuration(recipe.prepTimeISO)}</span>
        <span className="flex items-center gap-1"><Flame size={11} />{recipe.caloriesPerPerson} kcal</span>
        <span>Serves {recipe.recipeYield}</span>
      </div>

      {/* Ingredient count + URL links */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-zinc-400">
          {recipe.ingredients.filter((i) => !i.isStaple).length} ingredients
          {' · '}{recipe.instructions.length} steps
        </p>
        <div className="flex items-center gap-2">
          {recipe.sourceUrl && (
            <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer"
               onClick={(e) => e.stopPropagation()}
               title="View source recipe"
               className="text-zinc-300 hover:text-zinc-600 transition-colors">
              <Link size={12} />
            </a>
          )}
          {recipe.youtubeUrl && (
            <a href={recipe.youtubeUrl} target="_blank" rel="noopener noreferrer"
               onClick={(e) => e.stopPropagation()}
               title="Watch on YouTube"
               className="text-zinc-300 hover:text-red-500 transition-colors">
              <Youtube size={12} />
            </a>
          )}
        </div>
      </div>

      {/* Notes */}
      {editingNote ? (
        <div className="mt-auto pt-3 border-t border-zinc-100">
          <textarea
            value={noteVal}
            onChange={(e) => setNoteVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') cancelEdit(); }}
            placeholder="Your notes, tweaks, tips…"
            rows={2}
            autoFocus
            className="w-full text-xs border border-zinc-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
          <div className="flex gap-3 mt-1.5">
            <button onClick={saveNote}   className="text-xs font-semibold text-zinc-900 cursor-pointer hover:text-zinc-600">Save</button>
            <button onClick={cancelEdit} className="text-xs text-zinc-400 cursor-pointer hover:text-zinc-600">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="mt-auto">
          {note ? (
            <button
              onClick={startEdit}
              className="flex items-start gap-1.5 text-left w-full group mt-2 pt-2 border-t border-zinc-100"
            >
              <StickyNote size={11} className="text-zinc-300 group-hover:text-amber-400 flex-shrink-0 mt-0.5 transition-colors" />
              <p className="text-xs text-zinc-400 italic line-clamp-2 group-hover:text-zinc-600">{note}</p>
            </button>
          ) : (
            <button
              onClick={startEdit}
              className="flex items-center gap-1 text-xs text-zinc-300 hover:text-zinc-500 cursor-pointer transition-colors mt-2"
            >
              <Plus size={10} /> Add note
            </button>
          )}
        </div>
      )}

      {/* Edit / Delete row — only for custom */}
      {isCustom && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-zinc-100">
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 cursor-pointer transition-colors"
          >
            <Pencil size={12} /> Edit
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-red-500 cursor-pointer transition-colors ml-auto"
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ── Tab type ──────────────────────────────────────────────────────────────────

type Tab = 'recipes' | 'extras' | 'ingredients';

// ── Main view ─────────────────────────────────────────────────────────────────

interface RecipesViewProps {
  seedRecipes: Recipe[];
}

export default function RecipesView({ seedRecipes }: RecipesViewProps) {
  const {
    customRecipes, addRecipe, updateRecipe, deleteRecipe,
    favouriteIds, recipeNotes, toggleFavourite, setRecipeNote,
  } = useRecipeStore();

  const [activeTab,     setActiveTab]     = useState<Tab>('recipes');
  const [editorOpen,    setEditorOpen]    = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | undefined>(undefined);
  const [search,        setSearch]        = useState('');
  const [filterFav,     setFilterFav]     = useState(false);
  const [filterCuisine, setFilterCuisine] = useState('All');

  const openAdd  = () => { setEditingRecipe(undefined); setEditorOpen(true); };
  const openEdit = (r: Recipe) => { setEditingRecipe(r); setEditorOpen(true); };
  const closeEditor = () => { setEditorOpen(false); setEditingRecipe(undefined); };

  const handleSave = (data: Omit<Recipe, 'id'>) => {
    if (editingRecipe) updateRecipe(editingRecipe.id, data);
    else addRecipe(data);
    closeEditor();
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this recipe?')) deleteRecipe(id);
  };

  // Derived: all available cuisines across both lists
  const allRecipes = [...customRecipes, ...seedRecipes];
  const cuisines   = ['All', ...Array.from(new Set(allRecipes.map((r) => r.cuisine).filter((c): c is string => Boolean(c)))).sort()];

  // Filter function
  const applyFilters = (list: Recipe[]) =>
    list
      .filter((r) => !filterFav || favouriteIds.includes(r.id))
      .filter((r) => filterCuisine === 'All' || r.cuisine === filterCuisine)
      .filter((r) => !search.trim() || r.name.toLowerCase().includes(search.trim().toLowerCase()));

  const filteredCustom = applyFilters(customRecipes);
  const filteredSeed   = applyFilters(seedRecipes);
  const hasResults     = filteredCustom.length + filteredSeed.length > 0;
  const isFiltered     = !!(search.trim() || filterFav || filterCuisine !== 'All');

  const clearFilters = () => { setSearch(''); setFilterFav(false); setFilterCuisine('All'); };

  // ── Extras / Ingredients tabs ─────────────────────────────────────────────
  if (activeTab === 'extras' || activeTab === 'ingredients') {
    return (
      <div className="flex flex-col h-full">
        <div className="bg-white border-b border-zinc-200 px-4 pt-3 flex-shrink-0">
          <TabBar active={activeTab} onChange={setActiveTab} />
        </div>
        <div className="flex-1 overflow-hidden">
          {activeTab === 'extras' ? <ExtrasView /> : <IngredientsView />}
        </div>
      </div>
    );
  }

  // ── Recipes tab ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-zinc-50">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 px-4 pt-3 pb-3 flex-shrink-0">
        <TabBar active={activeTab} onChange={setActiveTab} />

        {/* Search + Add */}
        <div className="flex items-center gap-2 mt-3">
          <div className="flex-1 flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2">
            <Search size={13} className="text-zinc-400 flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search recipes…"
              className="flex-1 bg-transparent text-sm text-zinc-800 outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-zinc-300 hover:text-zinc-600 cursor-pointer">
                <X size={13} />
              </button>
            )}
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 bg-zinc-900 text-white px-4 py-2 rounded-2xl text-sm font-semibold hover:bg-zinc-700 transition-colors cursor-pointer flex-shrink-0"
          >
            <Plus size={15} /> Add
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 mt-2 overflow-x-auto pb-0.5 scrollbar-none">
          {/* Favourites filter */}
          <button
            onClick={() => setFilterFav((v) => !v)}
            className={`flex items-center gap-1.5 flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer
              ${filterFav
                ? 'bg-amber-50 border-amber-300 text-amber-700'
                : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-400'
              }`}
          >
            <Star size={11} className={filterFav ? 'fill-amber-400 text-amber-400' : ''} />
            Favourites
          </button>

          {/* Cuisine filters */}
          {cuisines.map((c) => (
            <button
              key={c}
              onClick={() => setFilterCuisine(c)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer
                ${filterCuisine === c
                  ? 'bg-zinc-900 border-zinc-900 text-white'
                  : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-400'
                }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-2xl mx-auto flex flex-col gap-4">

          {/* No results */}
          {isFiltered && !hasResults && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-400">
              <p className="text-sm mb-2">No recipes match your search.</p>
              <button onClick={clearFilters} className="text-xs font-semibold text-zinc-500 underline cursor-pointer">
                Clear filters
              </button>
            </div>
          )}

          {/* Custom recipes */}
          {filteredCustom.length > 0 && (
            <section>
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                My Recipes ({filteredCustom.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredCustom.map((r) => (
                  <RecipeCard
                    key={r.id}
                    recipe={r}
                    isCustom
                    isFavourite={favouriteIds.includes(r.id)}
                    note={recipeNotes[r.id] ?? ''}
                    onEdit={() => openEdit(r)}
                    onDelete={() => handleDelete(r.id)}
                    onToggleFavourite={() => toggleFavourite(r.id)}
                    onSaveNote={(n) => setRecipeNote(r.id, n)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Empty state when no custom recipes and no active filter */}
          {customRecipes.length === 0 && !isFiltered && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mb-3">
                <Plus size={20} className="text-zinc-400" />
              </div>
              <p className="text-sm font-semibold text-zinc-700 mb-1">No custom recipes yet</p>
              <p className="text-xs text-zinc-400 mb-4">Add your own and they'll appear in your meal plan.</p>
              <button
                onClick={openAdd}
                className="px-5 py-2.5 bg-zinc-900 text-white rounded-2xl text-sm font-semibold hover:bg-zinc-700 cursor-pointer transition-colors"
              >
                Add your first recipe
              </button>
            </div>
          )}

          {/* Seed recipes */}
          {filteredSeed.length > 0 && (
            <section>
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Built-in ({filteredSeed.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredSeed.map((r) => (
                  <RecipeCard
                    key={r.id}
                    recipe={r}
                    isCustom={false}
                    isFavourite={favouriteIds.includes(r.id)}
                    note={recipeNotes[r.id] ?? ''}
                    onToggleFavourite={() => toggleFavourite(r.id)}
                    onSaveNote={(n) => setRecipeNote(r.id, n)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Editor modal */}
      {editorOpen && (
        <RecipeEditor
          initial={editingRecipe}
          onSave={handleSave}
          onCancel={closeEditor}
        />
      )}
    </div>
  );
}

// ── Shared tab bar ────────────────────────────────────────────────────────────

const TAB_LABELS: Record<Tab, string> = {
  recipes:     '🍽 Recipes',
  extras:      '🥤 Extras',
  ingredients: '📦 Ingredients',
};

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <div className="flex gap-1">
      {(['recipes', 'extras', 'ingredients'] as Tab[]).map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`px-3 py-2 text-sm font-semibold rounded-t-xl transition-colors cursor-pointer whitespace-nowrap
            ${active === tab
              ? 'text-zinc-900 border-b-2 border-zinc-900'
              : 'text-zinc-400 hover:text-zinc-600'
            }`}
        >
          {TAB_LABELS[tab]}
        </button>
      ))}
    </div>
  );
}
