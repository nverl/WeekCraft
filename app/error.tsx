'use client';

/**
 * Global error boundary for the App Router.
 * Catches unhandled errors in the component tree and shows a recovery UI
 * instead of a white screen.
 */

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log to console (replace with Sentry or similar in production)
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-8 max-w-sm w-full text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle size={26} className="text-red-500" />
        </div>

        <h1 className="text-lg font-black text-zinc-900 mb-2">Something went wrong</h1>
        <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
          An unexpected error occurred. Your data is safe — try refreshing the page.
        </p>

        {error.digest && (
          <p className="text-[11px] text-zinc-300 font-mono mb-4">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <button
            onClick={reset}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            <RefreshCw size={14} />
            Try again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full py-3 rounded-2xl border border-zinc-200 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors cursor-pointer"
          >
            Go home
          </button>
        </div>
      </div>
    </div>
  );
}
