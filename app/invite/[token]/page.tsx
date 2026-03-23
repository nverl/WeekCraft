'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Users, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface InviteInfo {
  householdName: string;
  invitedBy: string;
  note: string | null;
  expiresAt: string;
}

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  // Resolve params
  useEffect(() => {
    params.then((p) => setToken(p.token));
  }, [params]);

  // Load invite info
  useEffect(() => {
    if (!token) return;
    fetch(`/api/household/invite/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setLoadError(data.error);
        else setInvite(data);
      })
      .catch(() => setLoadError('Failed to load invite'));
  }, [token]);

  async function handleAccept() {
    if (!token) return;
    setAccepting(true);
    setAcceptError(null);

    const res = await fetch(`/api/household/invite/${token}`, { method: 'POST' });
    const data = await res.json();

    if (res.ok) {
      setAccepted(true);
      setTimeout(() => router.push('/'), 2000);
    } else {
      setAcceptError(data.error ?? 'Failed to accept invite');
    }
    setAccepting(false);
  }

  // ── Redirect to login if not authed ──────────────────────────────────────
  if (status === 'unauthenticated') {
    router.push(`/login?callbackUrl=/invite/${token}`);
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-8 max-w-sm w-full text-center">

        {/* Loading */}
        {status === 'loading' || (!invite && !loadError) ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 size={28} className="animate-spin text-zinc-400" />
            <p className="text-sm text-zinc-400">Loading invite…</p>
          </div>

        /* Invalid / expired */
        ) : loadError ? (
          <>
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={24} className="text-red-500" />
            </div>
            <h1 className="text-lg font-black text-zinc-900 mb-2">Invite unavailable</h1>
            <p className="text-sm text-zinc-500 mb-6">{loadError}</p>
            <button
              onClick={() => router.push('/')}
              className="w-full py-3 rounded-2xl bg-zinc-900 text-white text-sm font-semibold cursor-pointer hover:bg-zinc-700 transition-colors"
            >
              Go to app
            </button>
          </>

        /* Accepted */
        ) : accepted ? (
          <>
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={24} className="text-emerald-500" />
            </div>
            <h1 className="text-lg font-black text-zinc-900 mb-2">You're in!</h1>
            <p className="text-sm text-zinc-500">
              Welcome to <strong>{invite?.householdName}</strong>. Redirecting you to the app…
            </p>
          </>

        /* Invite details + accept button */
        ) : invite ? (
          <>
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-5">
              <Users size={24} className="text-zinc-600" />
            </div>

            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Household invite</p>
            <h1 className="text-xl font-black text-zinc-900 mb-1">{invite.householdName}</h1>
            <p className="text-sm text-zinc-500 mb-1">
              <strong className="text-zinc-700">{invite.invitedBy}</strong> invited you to join
            </p>

            {invite.note && (
              <p className="text-sm text-zinc-500 italic bg-zinc-50 rounded-2xl px-4 py-3 mt-3 mb-1">
                "{invite.note}"
              </p>
            )}

            <p className="text-[11px] text-zinc-300 mt-2 mb-6">
              Expires {new Date(invite.expiresAt).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </p>

            <p className="text-xs text-zinc-400 mb-4">
              Logged in as <strong className="text-zinc-600">{session?.user?.name}</strong>
            </p>

            {acceptError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2.5 mb-4 text-left">
                <AlertCircle size={14} className="flex-shrink-0" />
                {acceptError}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-zinc-900 text-white text-sm font-semibold cursor-pointer hover:bg-zinc-700 disabled:opacity-60 transition-colors"
              >
                {accepting ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />}
                {accepting ? 'Joining…' : 'Join household'}
              </button>
              <button
                onClick={() => router.push('/')}
                className="w-full py-3 rounded-2xl border border-zinc-200 text-sm font-semibold text-zinc-500 cursor-pointer hover:bg-zinc-50 transition-colors"
              >
                Decline
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
