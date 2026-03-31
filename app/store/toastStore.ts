'use client';

import { create } from 'zustand';

export interface Toast {
  id: string;
  message: string;
  type: 'error' | 'success';
}

interface ToastStore {
  toasts: Toast[];
  addToast: (message: string, type?: 'error' | 'success') => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>()((set) => ({
  toasts: [],

  addToast: (message, type = 'error') => {
    const id = crypto.randomUUID();
    set((state) => ({
      // Cap at 3 visible toasts
      toasts: [...state.toasts.slice(-2), { id, message, type }],
    }));
    // Auto-dismiss after 4 s
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },

  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
