'use client';

import { useState, useRef, useEffect } from 'react';
import { User, Users, ChevronDown, Check } from 'lucide-react';
import { useHouseholdStore } from '@/app/store/householdStore';

/**
 * Compact dropdown in the app header that lets the user switch between:
 *   • Personal (their own plans)
 *   • Any household they own or are a member of
 *
 * Switching scope triggers a plan reload in DataLoader via the activeScope change.
 */
export default function HouseholdSwitcher() {
  const { activeScope, households, setActiveScope } = useHouseholdStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Nothing to switch if no households at all
  if (households.length === 0) return null;

  const activeHousehold = households.find((h) => h.id === activeScope);
  const label = activeScope === 'personal' ? 'Personal' : (activeHousehold?.name ?? 'Household');
  const isPersonal = activeScope === 'personal';

  function select(scope: string) {
    setActiveScope(scope);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 transition text-xs font-semibold text-zinc-700 cursor-pointer"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {isPersonal ? <User size={12} /> : <Users size={12} />}
        <span className="max-w-[90px] truncate">{label}</span>
        <ChevronDown size={11} className={`text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-2xl border border-zinc-200 shadow-lg z-50 py-1.5 overflow-hidden">
          {/* Personal option */}
          <button
            onClick={() => select('personal')}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-zinc-50 transition cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0">
              <User size={13} className="text-zinc-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-zinc-900 truncate">Personal</p>
              <p className="text-[10px] text-zinc-400">Your own planning</p>
            </div>
            {isPersonal && <Check size={13} className="text-zinc-900 flex-shrink-0" />}
          </button>

          {households.length > 0 && (
            <div className="my-1 border-t border-zinc-100" />
          )}

          {/* Household options */}
          {households.map((h) => {
            const isActive = activeScope === h.id;
            return (
              <button
                key={h.id}
                onClick={() => select(h.id)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-zinc-50 transition cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center flex-shrink-0">
                  <Users size={13} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-zinc-900 truncate">{h.name}</p>
                  <p className="text-[10px] text-zinc-400 capitalize">
                    {h.role} · {h.memberCount} {h.memberCount === 1 ? 'person' : 'people'}
                  </p>
                </div>
                {isActive && <Check size={13} className="text-zinc-900 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
