'use client';

import { useState, useRef, useEffect } from 'react';
import { useIngredientStore } from '@/app/store/ingredientStore';
import type { IngredientEntry } from '@/app/types';

interface IngredientAutocompleteProps {
  /** Current ingredient name value */
  value: string;
  /** Called when the name changes (free-type or catalog pick) */
  onChange: (name: string) => void;
  /** Called when the user selects a catalog entry — lets the parent update unit & aisle too */
  onSelect?: (entry: IngredientEntry) => void;
  placeholder?: string;
  className?: string;
}

export default function IngredientAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Ingredient',
  className = '',
}: IngredientAutocompleteProps) {
  const { ingredients } = useIngredientStore();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter the catalog to names containing the typed text (case-insensitive)
  const query = value.trim().toLowerCase();
  const suggestions = query.length < 1
    ? []
    : ingredients
        .filter((e) => e.name.toLowerCase().includes(query))
        .slice(0, 8); // cap at 8 suggestions

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handlePick = (entry: IngredientEntry) => {
    onChange(entry.name);
    onSelect?.(entry);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => value.trim().length > 0 && setOpen(true)}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />

      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
          {suggestions.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handlePick(entry); }}
                className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-zinc-50 transition-colors"
              >
                <span className="text-xs font-semibold text-zinc-800">{entry.name}</span>
                <span className="text-[10px] text-zinc-400 ml-2 flex-shrink-0">
                  {entry.aisle}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
