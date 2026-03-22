'use client';

import { useEffect } from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';

export interface ToastProps {
  message: string;
  type?: 'error' | 'success';
  onClose: () => void;
  /** Auto-dismiss after ms. Default 4000. Pass 0 to disable. */
  duration?: number;
}

export default function Toast({ message, type = 'error', onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    if (!duration) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [duration, onClose]);

  const isError = type === 'error';

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3
        px-4 py-3 rounded-2xl shadow-lg border max-w-sm w-[calc(100%-2rem)] animate-slide-up
        ${isError
          ? 'bg-red-50 border-red-200 text-red-800'
          : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}
    >
      {isError
        ? <AlertCircle size={16} className="flex-shrink-0 text-red-500" />
        : <CheckCircle size={16} className="flex-shrink-0 text-emerald-500" />
      }
      <p className="text-sm font-medium flex-1">{message}</p>
      <button
        onClick={onClose}
        className="flex-shrink-0 p-0.5 rounded-lg hover:bg-black/10 transition-colors cursor-pointer"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
