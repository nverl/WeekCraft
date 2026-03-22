'use client';

import { useEffect } from 'react';

export default function PWARegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('[WeekCraft] SW registered', reg.scope))
        .catch((err) => console.warn('[WeekCraft] SW registration failed', err));
    }
  }, []);

  return null;
}
