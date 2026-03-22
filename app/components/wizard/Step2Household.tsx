'use client';

import { Minus, Plus, ShoppingBag } from 'lucide-react';
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

  const totalSelected = selectedExtras.length;

  const getQty = (id: string) =>
    selectedExtras.find((e) => e.id === id)?.qty ?? 0;

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900 mb-1">Weekly extras</h2>
      <p className="text-zinc-500 mb-6 text-sm">
        Add drinks, snacks and sides for the week. Set how many you need — ingredients are scaled automatically.
      </p>

      <div className="flex flex-col gap-3">
        {extras.map((extra) => {
          const qty = getQty(extra.id);
          const selected = qty > 0;

          return (
            <div
              key={extra.id}
              className={`flex items-center justify-between gap-4 p-4 rounded-2xl border transition-all
                ${selected
                  ? 'border-zinc-300 bg-white shadow-sm'
                  : 'border-zinc-100 bg-zinc-50'
                }`}
            >
              {/* Left — extra info */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="text-2xl flex-shrink-0">{extra.emoji}</span>
                <div className="min-w-0">
                  <p className={`text-sm font-bold leading-tight truncate ${selected ? 'text-zinc-900' : 'text-zinc-500'}`}>
                    {extra.name}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {extra.ingredients.length} ingredient{extra.ingredients.length !== 1 ? 's' : ''}
                    {qty > 0 && (
                      <span className="ml-1.5 text-zinc-500 font-semibold">
                        · {extra.ingredients.map((i) =>
                          `${Math.round(i.amount * qty * 100) / 100} ${i.unit} ${i.name}`
                        ).slice(0, 2).join(', ')}
                        {extra.ingredients.length > 2 && ' …'}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Right — qty stepper */}
              <QtyStepper qty={qty} onChange={(q) => setWizardExtraQty(extra.id, q)} />
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
