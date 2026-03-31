'use client';

import { X, AlertCircle, Check } from 'lucide-react';
import { useToastStore } from '@/app/store/toastStore';

export default function Toast() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg pointer-events-auto
            ${t.type === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-emerald-600 text-white'
            }`}
        >
          {t.type === 'error'
            ? <AlertCircle size={16} className="flex-shrink-0" />
            : <Check size={16} className="flex-shrink-0" />
          }
          <p className="flex-1 text-sm font-medium">{t.message}</p>
          <button
            onClick={() => removeToast(t.id)}
            className="flex-shrink-0 opacity-70 hover:opacity-100 cursor-pointer transition-opacity"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
