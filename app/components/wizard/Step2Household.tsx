'use client';

import { Users, CalendarDays, Minus, Plus } from 'lucide-react';
import { useWizardStore } from '@/app/store/wizardStore';
import { useExtrasStore } from '@/app/store/extrasStore';

interface CounterProps {
  label: string;
  value: number;
  min: number;
  max: number;
  icon: React.ReactNode;
  onChange: (n: number) => void;
  suffix?: string;
}

function Counter({ label, value, min, max, icon, onChange, suffix }: CounterProps) {
  return (
    <div className="flex flex-col gap-3 bg-zinc-50 border border-zinc-200 rounded-2xl p-6">
      <div className="flex items-center gap-2 text-zinc-600">
        {icon}
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-10 h-10 rounded-full border-2 border-zinc-300 flex items-center justify-center text-zinc-600 hover:border-zinc-900 hover:text-zinc-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
          aria-label={`Decrease ${label}`}
        >
          <Minus size={16} />
        </button>
        <div className="flex-1 text-center">
          <span className="text-4xl font-black text-zinc-900">{value}</span>
          {suffix && <span className="text-sm text-zinc-500 ml-1">{suffix}</span>}
        </div>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-10 h-10 rounded-full border-2 border-zinc-300 flex items-center justify-center text-zinc-600 hover:border-zinc-900 hover:text-zinc-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
          aria-label={`Increase ${label}`}
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

export default function Step2Household() {
  const { people, days, dayConfigs, setPeople, setDays, selectedExtras, toggleWizardExtra } = useWizardStore();
  const { extras } = useExtrasStore();

  // Compute summary stats from per-day configs
  const recipeDays = dayConfigs.slice(0, days).filter((c) => c.label !== 'none').length;
  const freeDays = days - recipeDays;

  // Estimate total kcal: free days use their entered calories or 500 avg; recipe days use their cap or 500 avg
  const estKcal = dayConfigs.slice(0, days).reduce((sum, c) => {
    if (c.label === 'none') return sum + (c.freeCalories ?? 500) * people;
    return sum + (c.maxCalories ?? 500) * people;
  }, 0);

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900 mb-1">Household size</h2>
      <p className="text-zinc-500 mb-6 text-sm">
        Ingredient amounts will be scaled automatically for your household.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Counter
          label="People"
          value={people}
          min={1}
          max={12}
          icon={<Users size={18} />}
          onChange={setPeople}
          suffix="people"
        />
        <Counter
          label="Days to plan"
          value={days}
          min={1}
          max={7}
          icon={<CalendarDays size={18} />}
          onChange={setDays}
          suffix="days"
        />
      </div>

      {/* Summary card */}
      <div className="bg-zinc-900 text-white rounded-2xl p-5 flex justify-around text-center">
        <div>
          <div className="text-2xl font-black">{recipeDays}</div>
          <div className="text-xs text-zinc-400 mt-0.5">Meals planned</div>
        </div>
        <div className="w-px bg-zinc-700" />
        <div>
          <div className="text-2xl font-black">{people}</div>
          <div className="text-xs text-zinc-400 mt-0.5">Servings / meal</div>
        </div>
        <div className="w-px bg-zinc-700" />
        <div>
          <div className="text-2xl font-black">~{Math.round(estKcal / 1000)}k</div>
          <div className="text-xs text-zinc-400 mt-0.5">Est. total kcal</div>
        </div>
      </div>

      {freeDays > 0 && (
        <p className="text-xs text-zinc-400 mt-3 text-center">
          {freeDays} free day{freeDays > 1 ? 's' : ''} won&apos;t generate a recipe.
          Calorie estimate uses ~500 kcal/meal average for uncapped days.
        </p>
      )}

      {/* ── Weekly extras ──────────────────────────────────────────────── */}
      <div className="mt-8">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-sm font-bold text-zinc-800">Weekly extras</h3>
          <span className="text-xs text-zinc-400">Added to your shopping list</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {extras.map((extra) => {
            const selected = selectedExtras.includes(extra.id);
            return (
              <button
                key={extra.id}
                type="button"
                onClick={() => toggleWizardExtra(extra.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer
                  ${selected
                    ? 'bg-zinc-900 border-zinc-900 text-white'
                    : 'border-zinc-200 text-zinc-600 bg-white hover:border-zinc-400'
                  }`}
              >
                <span>{extra.emoji}</span>
                {extra.name}
              </button>
            );
          })}
        </div>
        {selectedExtras.length > 0 && (
          <p className="text-xs text-zinc-400 mt-2.5">
            {selectedExtras.length} extra{selectedExtras.length > 1 ? 's' : ''} selected — ingredients will be added to your shopping list.
          </p>
        )}
      </div>
    </div>
  );
}
