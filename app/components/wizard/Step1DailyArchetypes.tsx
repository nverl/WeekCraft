'use client';

import { useState } from 'react';
import { Leaf, Zap, Flame, Coffee, Clock, ChevronDown, ChevronUp, Dumbbell, Shuffle, Minus, Plus, Users } from 'lucide-react';
import { useWizardStore } from '@/app/store/wizardStore';
import type { DayConfig } from '@/app/types';

const DAY_ABBR = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const LABEL_OPTIONS = [
  {
    value: 'healthy' as const,
    icon: <Leaf size={14} />,
    label: 'Healthy',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-300',
    ring: 'ring-emerald-400',
  },
  {
    value: 'high-protein' as const,
    icon: <Dumbbell size={14} />,
    label: 'High Protein',
    color: 'text-violet-700',
    bg: 'bg-violet-50',
    border: 'border-violet-300',
    ring: 'ring-violet-400',
  },
  {
    value: 'low-carb' as const,
    icon: <Zap size={14} />,
    label: 'Low Carb',
    color: 'text-sky-700',
    bg: 'bg-sky-50',
    border: 'border-sky-300',
    ring: 'ring-sky-400',
  },
  {
    value: 'cheat' as const,
    icon: <Flame size={14} />,
    label: 'Cheat',
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-300',
    ring: 'ring-orange-400',
  },
  {
    value: 'any' as const,
    icon: <Shuffle size={14} />,
    label: 'Any',
    color: 'text-zinc-600',
    bg: 'bg-zinc-50',
    border: 'border-zinc-300',
    ring: 'ring-zinc-400',
  },
  {
    value: 'none' as const,
    icon: <Coffee size={14} />,
    label: 'Free day',
    color: 'text-zinc-400',
    bg: 'bg-zinc-100',
    border: 'border-zinc-200',
    ring: 'ring-zinc-300',
  },
];

const PREP_OPTIONS: { label: string; value: number | null }[] = [
  { label: 'Any',    value: null },
  { label: '20 min', value: 20   },
  { label: '30 min', value: 30   },
  { label: '45 min', value: 45   },
  { label: '60 min', value: 60   },
];

const CAL_OPTIONS: { label: string; value: number | null }[] = [
  { label: 'Any',  value: null },
  { label: '400',  value: 400  },
  { label: '500',  value: 500  },
  { label: '700',  value: 700  },
  { label: '1000', value: 1000 },
];

function getLabelOpt(label: DayConfig['label']) {
  return LABEL_OPTIONS.find((o) => o.value === label) ?? LABEL_OPTIONS[3];
}

// ─── DayRow ──────────────────────────────────────────────────────────────────

interface DayRowProps {
  dayIndex: number;
  config: DayConfig;
  isOpen: boolean;
  onToggle: () => void;
  onChange: (partial: Partial<DayConfig>) => void;
  defaultPeople: number;
}

function DayRow({ dayIndex, config, isOpen, onToggle, onChange, defaultPeople }: DayRowProps) {
  const badge = getLabelOpt(config.label);
  const hasFilters = config.label !== 'none' && (config.maxPrepMins !== null || config.maxCalories !== null);

  return (
    <div
      className={`border rounded-2xl overflow-hidden transition-all ${
        isOpen ? 'border-zinc-300 shadow-sm' : 'border-zinc-200'
      }`}
    >
      {/* Row header — tap to open/close */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-zinc-50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-bold text-zinc-600 w-8 flex-shrink-0">{DAY_ABBR[dayIndex]}</span>

          {/* Label badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold flex-shrink-0 ${badge.bg} ${badge.color} ${badge.border}`}
          >
            {badge.icon}
            {badge.label}
          </div>

          {/* Filter hints */}
          {hasFilters && (
            <span className="text-[10px] text-zinc-400 font-medium truncate">
              {[
                config.maxPrepMins && `≤${config.maxPrepMins}m`,
                config.maxCalories && `≤${config.maxCalories}kcal`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          )}

          {/* Free day note preview */}
          {config.label === 'none' && config.freeNote && (
            <span className="text-[10px] text-zinc-400 italic truncate">{config.freeNote}</span>
          )}
        </div>

        {isOpen ? (
          <ChevronUp size={15} className="text-zinc-400 flex-shrink-0" />
        ) : (
          <ChevronDown size={15} className="text-zinc-400 flex-shrink-0" />
        )}
      </button>

      {/* Expanded section */}
      {isOpen && (
        <div className="bg-zinc-50 border-t border-zinc-100 px-4 py-4 flex flex-col gap-4">
          {/* Meal type chips */}
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Meal type</p>
            <div className="flex gap-2 flex-wrap">
              {LABEL_OPTIONS.map((opt) => {
                const isSelected = config.label === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => onChange({ label: opt.value })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer
                      ${
                        isSelected
                          ? `${opt.bg} ${opt.color} ${opt.border} ring-2 ring-offset-1 ${opt.ring}`
                          : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-400'
                      }`}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recipe filters — only when a recipe label is selected */}
          {config.label !== 'none' && (
            <>
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Clock size={10} /> Max prep time
                </p>
                <div className="flex gap-2 flex-wrap">
                  {PREP_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => onChange({ maxPrepMins: opt.value })}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer
                        ${
                          config.maxPrepMins === opt.value
                            ? 'bg-zinc-900 text-white border-zinc-900'
                            : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400'
                        }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Flame size={10} /> Max cal / person
                </p>
                <div className="flex gap-2 flex-wrap">
                  {CAL_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => onChange({ maxCalories: opt.value })}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer
                        ${
                          config.maxCalories === opt.value
                            ? 'bg-zinc-900 text-white border-zinc-900'
                            : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400'
                        }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Free day fields — only when 'none' */}
          {config.label === 'none' && (
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Note (optional)</p>
                <input
                  type="text"
                  value={config.freeNote}
                  onChange={(e) => onChange({ freeNote: e.target.value })}
                  placeholder="e.g. Restaurant, Leftovers, Take-away…"
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm text-zinc-800 bg-white focus:outline-none focus:border-zinc-400"
                />
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Calories (optional)</p>
                <input
                  type="number"
                  value={config.freeCalories ?? ''}
                  onChange={(e) =>
                    onChange({ freeCalories: e.target.value ? Number(e.target.value) : null })
                  }
                  placeholder="e.g. 600"
                  min={0}
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm text-zinc-800 bg-white focus:outline-none focus:border-zinc-400"
                />
              </div>
            </div>
          )}

          {/* Per-day people override (recipe days only) */}
          {config.label !== 'none' && (
            <div className="flex items-center justify-between bg-white border border-zinc-200 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
                <Users size={14} className="text-zinc-400" />
                <span>People this day</span>
                {config.people === undefined && (
                  <span className="text-[10px] font-medium text-zinc-400">(using default)</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onChange({ people: Math.max(1, (config.people ?? defaultPeople) - 1) })}
                  className="w-7 h-7 rounded-full border border-zinc-300 flex items-center justify-center text-zinc-600 hover:border-zinc-900 hover:text-zinc-900 transition-all cursor-pointer"
                >
                  <Minus size={12} />
                </button>
                <span className="w-6 text-center text-sm font-black text-zinc-900">
                  {config.people ?? defaultPeople}
                </span>
                <button
                  onClick={() => onChange({ people: Math.min(12, (config.people ?? defaultPeople) + 1) })}
                  className="w-7 h-7 rounded-full border border-zinc-300 flex items-center justify-center text-zinc-600 hover:border-zinc-900 hover:text-zinc-900 transition-all cursor-pointer"
                >
                  <Plus size={12} />
                </button>
                {config.people !== undefined && (
                  <button
                    onClick={() => onChange({ people: undefined })}
                    className="text-[10px] font-medium text-zinc-400 hover:text-zinc-600 underline cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Collapse button */}
          <div className="flex justify-end">
            <button
              onClick={onToggle}
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 border border-zinc-200 rounded-xl px-3 py-1.5 hover:border-zinc-400 transition-all cursor-pointer bg-white"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step1DailyArchetypes ─────────────────────────────────────────────────────

export default function Step1DailyArchetypes() {
  const { dayConfigs, setDayConfig, people } = useWizardStore();
  const [openDay, setOpenDay] = useState<number | null>(0); // Monday open by default

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900 mb-1">Set your daily plan</h2>
      <p className="text-zinc-500 mb-5 text-sm">
        Tap a day to set its meal type, filters, or mark it as a free day.
      </p>

      <div className="flex flex-col gap-2">
        {DAY_ABBR.map((_, i) => (
          <DayRow
            key={i}
            dayIndex={i}
            config={
              dayConfigs[i] ?? {
                label: 'healthy',
                maxPrepMins: null,
                maxCalories: null,
                freeNote: '',
                freeCalories: null,
              }
            }
            isOpen={openDay === i}
            onToggle={() => setOpenDay(openDay === i ? null : i)}
            onChange={(partial) => setDayConfig(i, partial)}
            defaultPeople={people}
          />
        ))}
      </div>
    </div>
  );
}
