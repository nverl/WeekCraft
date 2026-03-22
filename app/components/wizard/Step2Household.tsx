'use client';

import { useState } from 'react';
import { Minus, Plus, ShoppingBag, ChevronDown } from 'lucide-react';
import { useWizardStore } from '@/app/store/wizardStore';
import { useExtrasStore } from '@/app/store/extrasStore';

// ── Qty stepper ───────────────────────────────────────────────────────────────

interface QtyStepperProps {
  qty: number;
  onChange: (qty: number) => void;
  min?: number;
  max?: number;
}

function QtyStepper({ qty, onChange, min = 0, max = 20 }: QtyStepperProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, qty - 1))}
        disabled={qty <= min}
        className="w-7 h-7 rounded-full border border-zinc-300 flex items-center justify-center text-zinc-600 hover:border-zinc-900 hover:text-zinc-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
        aria-label="Decrease"
      >
        <Minus size={12} />
      </button>
      <span className="w-5 text-center text-sm font-black text-zinc-900">{qty}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, qty + 1))}
        disabled={qty >= max}
        className="w-7 h-7 rounded-full border border-zinc-300 flex items-center justify-center text-zinc-600 hover:border-zinc-900 hover:text-zinc-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
        aria-label="Increase"
      >
        <Plus size={12} />
      </button>
    </div>
  );
}

// ── Main step ─────────────────────────────────────────────────────────────────

export default function Step2WeeklyExtras() {
  const { selectedExtras, setWizardExtraQty } = useWizardStore();
  const { extras } = useExtrasStore();
  const [openIngId, setOpenIngId] = useState<string | null>(null);

  const totalSelected = selectedExtras.length;

  const getQty = (id: string) =>
    selectedExtras.find((e) => e.id === id)?.qty ?? 0;

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900 mb-1">Weekly extras</h2>
      <p className="text-zinc-500 mb-6 text-sm">
        Add smoothies, snacks, or breakfast items for the week.
      </p>

      <div className="flex flex-col gap-3">
        {extras.map((extra) => {
          const qty = getQty(extra.id);
          const selected = qty > 0;

          const isIngOpen = openIngId === extra.id;

          return (
            <div
              key={extra.id}
              className={`group rounded-2xl border transition-all
                ${selected
                  ? 'border-zinc-300 bg-white shadow-sm'
                  : 'border-zinc-100 bg-zinc-50'
                }`}
            >
              {/* Main row */}
              <div className="flex items-center justify-between gap-4 p-4">
                {/* Left — extra info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-2xl flex-shrink-0">{extra.emoji}</span>
                  <div className="min-w-0">
                    <p className={`text-sm font-bold leading-tight truncate ${selected ? 'text-zinc-900' : 'text-zinc-500'}`}>
                      {extra.name}
                    </p>
                    {/* Ingredient preview — tap to expand */}
                    {extra.ingredients.length > 0 && (
                      <button
                        onClick={() => setOpenIngId(isIngOpen ? null : extra.id)}
                        className="flex items-center gap-1 text-left mt-0.5"
                      >
                        <p className="text-[11px] text-zinc-400">
                          {extra.ingredients.slice(0, 2).map((i) => i.name).join(', ')}
                          {extra.ingredients.length > 2 && ` +${extra.ingredients.length - 2}`}
                        </p>
                        <ChevronDown
                          size={11}
                          className={`text-zinc-300 flex-shrink-0 transition-transform ${isIngOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                    )}
                  </div>
                </div>

                {/* Right — qty stepper */}
                <QtyStepper qty={qty} onChange={(q) => setWizardExtraQty(extra.id, q)} />
              </div>

              {/* Full ingredient list — shown only when tapped */}
              {extra.ingredients.length > 0 && (
                <div
                  className={`px-4 pb-3 flex-col gap-1
                    ${isIngOpen ? 'flex' : 'hidden'}`}
                >
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Ingredients {qty > 0 ? `(×${qty})` : ''}
                  </p>
                  {extra.ingredients.map((ing) => {
                    const scaled = qty > 0
                      ? Math.round(ing.amount * qty * 100) / 100
                      : ing.amount;
                    return (
                      <div key={ing.name} className="flex items-baseline gap-2 text-[12px]">
                        <span className="font-semibold text-zinc-600 w-16 text-right flex-shrink-0">
                          {scaled} {ing.unit}
                        </span>
                        <span className="text-zinc-500">{ing.name}</span>
                      </div>
                    );
                  })}
                  {qty === 0 && (
                    <p className="text-[10px] text-zinc-300 italic mt-0.5">Set a quantity to see scaled amounts</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {totalSelected > 0 && (
        <div className="mt-5 flex items-center gap-2 px-4 py-3 bg-zinc-900 text-white rounded-2xl">
          <ShoppingBag size={15} className="flex-shrink-0" />
          <p className="text-sm font-semibold">
            {selectedExtras.map((e) => {
              const extra = extras.find((x) => x.id === e.id);
              return extra ? `${e.qty}× ${extra.name}` : null;
            }).filter(Boolean).join(' · ')}
          </p>
        </div>
      )}

      {totalSelected === 0 && (
        <p className="mt-4 text-xs text-zinc-400 text-center">
          Skip this step if you don&apos;t need extras — your shopping list will still include all recipe ingredients.
        </p>
      )}
    </div>
  );
}
