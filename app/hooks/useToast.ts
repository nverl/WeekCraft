'use client';

import { useState, useCallback } from 'react';

export interface ToastState {
  message: string;
  type: 'error' | 'success';
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showError = useCallback((message: string) => {
    setToast({ message, type: 'error' });
  }, []);

  const showSuccess = useCallback((message: string) => {
    setToast({ message, type: 'success' });
  }, []);

  const dismiss = useCallback(() => setToast(null), []);

  return { toast, showError, showSuccess, dismiss };
}
