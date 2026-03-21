'use client';

import { CalendarDays, ShoppingCart, Sparkles } from 'lucide-react';

export type AppView = 'calendar' | 'shopping';

interface NavBarProps {
  view: AppView;
  onChangeView: (v: AppView) => void;
}

const NAV_ITEMS: { id: AppView; label: string; icon: React.ReactNode }[] = [
  { id: 'calendar',  label: 'Calendar',  icon: <CalendarDays size={20} /> },
  { id: 'shopping',  label: 'Shopping',  icon: <ShoppingCart size={20} /> },
];

export default function NavBar({ view, onChangeView }: NavBarProps) {
  return (
    <div className="flex flex-col h-screen">
      {/* Top app bar */}
      <header className="bg-white border-b border-zinc-200 px-4 py-3 flex items-center gap-2 flex-shrink-0">
        <Sparkles size={18} className="text-orange-500" />
        <span className="font-black text-zinc-900 text-base">KitchenFlow</span>
      </header>

      {/* Main content slot — rendered by parent */}
      <div className="flex-1 overflow-hidden" id="main-content-slot" />

      {/* Bottom nav */}
      <nav className="bg-white border-t border-zinc-200 px-6 py-2 flex-shrink-0">
        <div className="flex justify-around max-w-sm mx-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onChangeView(item.id)}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all cursor-pointer
                  ${isActive ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
              >
                {item.icon}
                <span className={`text-xs font-semibold ${isActive ? 'text-zinc-900' : ''}`}>
                  {item.label}
                </span>
                {isActive && (
                  <div className="w-1 h-1 rounded-full bg-zinc-900" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
