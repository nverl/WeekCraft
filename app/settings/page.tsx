'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, User, Lock, Trash2,
  Check, AlertCircle, Eye, EyeOff, LogOut, Users, Minus, Plus,
  Link2, Copy, UserPlus, UserMinus, Crown, Home,
} from 'lucide-react';

// ── Reusable feedback pill ────────────────────────────────────────────────────
function Feedback({ type, message }: { type: 'success' | 'error'; message: string }) {
  return (
    <div className={`flex items-center gap-2 text-sm rounded-xl px-3.5 py-2.5 mt-3
      ${type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
      {type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
      {message}
    </div>
  );
}

// ── Section card shell ────────────────────────────────────────────────────────
function Section({ icon, title, children }: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-3xl border border-zinc-100 p-6">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-600">
          {icon}
        </div>
        <h2 className="text-sm font-bold text-zinc-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ── Label + input helper ──────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full px-4 py-3 rounded-2xl border border-zinc-200 text-sm text-zinc-900 bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white transition';

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();

  // Profile data
  const [memberSince, setMemberSince] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState('');

  // Default people
  const [defaultPeople, setDefaultPeople] = useState(2);
  const [peopleFeedback, setPeopleFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [peopleLoading, setPeopleLoading] = useState(false);

  // Username change
  const [newUsername, setNewUsername] = useState('');
  const [usernameFeedback, setUsernameFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [usernameLoading, setUsernameLoading] = useState(false);

  // Password change
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwFeedback, setPwFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  // Delete account
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteFeedback, setDeleteFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const deleteInputRef = useRef<HTMLInputElement>(null);

  // Household
  interface HouseholdMemberInfo { userId: string; username: string; joinedAt: string }
  interface PendingInvite { id: string; token: string; note: string | null; expiresAt: string; inviteUrl: string }
  interface HouseholdInfo {
    id: string; name: string; role: 'owner' | 'member';
    ownerUsername?: string;
    members: HouseholdMemberInfo[];
    pendingInvites: PendingInvite[];
  }
  const [household, setHousehold] = useState<HouseholdInfo | null | 'loading'>('loading');
  const [householdFeedback, setHouseholdFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [householdName, setHouseholdName] = useState('');
  const [newHouseholdName, setNewHouseholdName] = useState('');
  const [creatingHousehold, setCreatingHousehold] = useState(false);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [inviteNote, setInviteNote] = useState('');

  // Warn before leaving with unsaved form data
  useEffect(() => {
    const hasUnsaved = () =>
      newUsername !== currentUsername ||
      currentPw !== '' ||
      newPw !== '' ||
      confirmPw !== '';

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsaved()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [newUsername, currentUsername, currentPw, newPw, confirmPw]);

  // Load account info
  useEffect(() => {
    fetch('/api/account/me')
      .then((r) => r.json())
      .then((d) => {
        setCurrentUsername(d.username ?? '');
        setNewUsername(d.username ?? '');
        setDefaultPeople(d.defaultPeople ?? 2);
        if (d.createdAt) {
          setMemberSince(new Date(d.createdAt).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'long', year: 'numeric',
          }));
        }
      });
  }, []);

  useEffect(() => {
    if (deleteOpen) setTimeout(() => deleteInputRef.current?.focus(), 50);
  }, [deleteOpen]);

  // Load household
  useEffect(() => {
    fetch('/api/household')
      .then((r) => r.json())
      .then((d) => {
        setHousehold(d);
        if (d) setHouseholdName(d.name);
      })
      .catch(() => setHousehold(null));
  }, []);

  async function handleCreateHousehold() {
    if (!newHouseholdName.trim()) return;
    setCreatingHousehold(true);
    setHouseholdFeedback(null);
    const res = await fetch('/api/household', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newHouseholdName.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      setHousehold({ id: data.id, name: data.name, role: 'owner', members: [], pendingInvites: [] });
      setHouseholdName(data.name);
      setNewHouseholdName('');
    } else {
      setHouseholdFeedback({ type: 'error', msg: data.error ?? 'Failed to create household' });
    }
    setCreatingHousehold(false);
  }

  async function handleGenerateInvite() {
    setGeneratingInvite(true);
    setHouseholdFeedback(null);
    const res = await fetch('/api/household/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: inviteNote.trim() || null }),
    });
    const data = await res.json();
    if (res.ok) {
      const fullUrl = `${window.location.origin}${data.inviteUrl}`;
      await navigator.clipboard.writeText(fullUrl).catch(() => {});
      setCopiedToken(data.token);
      setHousehold((prev) => {
        if (!prev || prev === 'loading') return prev;
        return {
          ...prev,
          pendingInvites: [
            ...prev.pendingInvites,
            { id: data.token, token: data.token, note: inviteNote.trim() || null, expiresAt: data.expiresAt, inviteUrl: data.inviteUrl },
          ],
        };
      });
      setInviteNote('');
      setTimeout(() => setCopiedToken(null), 3000);
    } else {
      setHouseholdFeedback({ type: 'error', msg: data.error ?? 'Failed to generate invite' });
    }
    setGeneratingInvite(false);
  }

  async function handleRevokeInvite(token: string) {
    await fetch(`/api/household/invite/${token}`, { method: 'DELETE' });
    setHousehold((prev) => {
      if (!prev || prev === 'loading') return prev;
      return { ...prev, pendingInvites: prev.pendingInvites.filter((i) => i.token !== token) };
    });
  }

  async function handleRemoveMember(userId: string) {
    const res = await fetch(`/api/household/member/${userId}`, { method: 'DELETE' });
    if (res.ok) {
      setHousehold((prev) => {
        if (!prev || prev === 'loading') return prev;
        return { ...prev, members: prev.members.filter((m) => m.userId !== userId) };
      });
    }
  }

  async function handleLeaveOrDissolve() {
    const res = await fetch('/api/household', { method: 'DELETE' });
    if (res.ok) setHousehold(null);
    else setHouseholdFeedback({ type: 'error', msg: 'Failed. Try again.' });
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function handleDefaultPeopleChange(n: number) {
    const clamped = Math.min(12, Math.max(1, n));
    setDefaultPeople(clamped);
    setPeopleFeedback(null);
    setPeopleLoading(true);
    const res = await fetch('/api/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'defaultPeople', defaultPeople: clamped }),
    });
    const data = await res.json();
    setPeopleLoading(false);
    if (!res.ok) setPeopleFeedback({ type: 'error', msg: data.error });
    else setPeopleFeedback({ type: 'success', msg: 'Default saved' });
  }

  async function handleUsernameChange(e: React.FormEvent) {
    e.preventDefault();
    setUsernameFeedback(null);
    if (newUsername === currentUsername) {
      setUsernameFeedback({ type: 'error', msg: 'That\'s already your username' });
      return;
    }
    setUsernameLoading(true);
    const res = await fetch('/api/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'username', username: newUsername }),
    });
    const data = await res.json();
    setUsernameLoading(false);
    if (!res.ok) {
      setUsernameFeedback({ type: 'error', msg: data.error });
    } else {
      setCurrentUsername(data.username);
      setUsernameFeedback({ type: 'success', msg: 'Username updated' });
      await updateSession({ name: data.username });
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwFeedback(null);
    if (newPw !== confirmPw) {
      setPwFeedback({ type: 'error', msg: 'Passwords do not match' });
      return;
    }
    setPwLoading(true);
    const res = await fetch('/api/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'password', currentPassword: currentPw, newPassword: newPw }),
    });
    const data = await res.json();
    setPwLoading(false);
    if (!res.ok) {
      setPwFeedback({ type: 'error', msg: data.error });
    } else {
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setPwFeedback({ type: 'success', msg: 'Password changed successfully' });
    }
  }

  async function handleDeleteAccount() {
    setDeleteLoading(true);
    const res = await fetch('/api/account', { method: 'DELETE' });
    if (res.ok) {
      await signOut({ callbackUrl: '/login' });
    } else {
      setDeleteLoading(false);
      setDeleteFeedback({ type: 'error', msg: 'Could not delete account. Try again.' });
    }
  }

  const initials = (currentUsername || session?.user?.name || '?').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="bg-white border-b border-zinc-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-zinc-100 text-zinc-600 transition cursor-pointer"
          aria-label="Back"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-base font-black text-zinc-900">Account Settings</h1>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-4">

        {/* Avatar + info */}
        <div className="flex items-center gap-4 px-2 pb-2">
          <div className="w-14 h-14 rounded-full bg-zinc-900 flex items-center justify-center text-white text-lg font-black flex-shrink-0">
            {initials}
          </div>
          <div>
            <p className="font-bold text-zinc-900 text-base">{currentUsername}</p>
            {memberSince && (
              <p className="text-xs text-zinc-400 mt-0.5">Member since {memberSince}</p>
            )}
          </div>
        </div>

        {/* Default people */}
        <Section icon={<Users size={15} />} title="Default household size">
          <div className="flex flex-col gap-3">
            <p className="text-xs text-zinc-500">
              Used to scale ingredients in every new meal plan. You can still adjust it per week or per meal.
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleDefaultPeopleChange(defaultPeople - 1)}
                disabled={defaultPeople <= 1}
                className="w-10 h-10 rounded-full border-2 border-zinc-200 flex items-center justify-center text-zinc-600 hover:border-zinc-900 hover:text-zinc-900 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <Minus size={16} />
              </button>
              <div className="flex-1 text-center">
                <span className="text-4xl font-black text-zinc-900">{defaultPeople}</span>
                <span className="text-sm text-zinc-500 ml-1">{defaultPeople === 1 ? 'person' : 'people'}</span>
              </div>
              <button
                onClick={() => handleDefaultPeopleChange(defaultPeople + 1)}
                disabled={defaultPeople >= 12}
                className="w-10 h-10 rounded-full border-2 border-zinc-200 flex items-center justify-center text-zinc-600 hover:border-zinc-900 hover:text-zinc-900 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <Plus size={16} />
              </button>
            </div>
            {peopleLoading && <p className="text-xs text-zinc-400 text-center">Saving…</p>}
            {peopleFeedback && <Feedback type={peopleFeedback.type} message={peopleFeedback.msg} />}
          </div>
        </Section>

        {/* Change username */}
        <Section icon={<User size={15} />} title="Username">
          <form onSubmit={handleUsernameChange} className="flex flex-col gap-4">
            <Field label="New username">
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                minLength={3}
                required
                className={inputCls}
              />
            </Field>
            {usernameFeedback && <Feedback type={usernameFeedback.type} message={usernameFeedback.msg} />}
            <button
              type="submit"
              disabled={usernameLoading || !newUsername.trim()}
              className="self-end px-5 py-2.5 rounded-2xl bg-zinc-900 text-white text-sm font-bold hover:bg-zinc-700 transition disabled:opacity-40 cursor-pointer"
            >
              {usernameLoading ? 'Saving…' : 'Save username'}
            </button>
          </form>
        </Section>

        {/* Change password */}
        <Section icon={<Lock size={15} />} title="Password">
          <form onSubmit={handlePasswordChange} className="flex flex-col gap-4">
            <Field label="Current password">
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  required
                  autoComplete="current-password"
                  className={`${inputCls} pr-11`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </Field>
            <Field label="New password">
              <input
                type={showPw ? 'text' : 'password'}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className={inputCls}
                placeholder="At least 6 characters"
              />
            </Field>
            <Field label="Confirm new password">
              <input
                type={showPw ? 'text' : 'password'}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                required
                autoComplete="new-password"
                className={inputCls}
                placeholder="Repeat new password"
              />
            </Field>
            {pwFeedback && <Feedback type={pwFeedback.type} message={pwFeedback.msg} />}
            <button
              type="submit"
              disabled={pwLoading || !currentPw || !newPw || !confirmPw}
              className="self-end px-5 py-2.5 rounded-2xl bg-zinc-900 text-white text-sm font-bold hover:bg-zinc-700 transition disabled:opacity-40 cursor-pointer"
            >
              {pwLoading ? 'Saving…' : 'Change password'}
            </button>
          </form>
        </Section>

        {/* Sign out */}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border border-zinc-200 bg-white text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition cursor-pointer"
        >
          <LogOut size={15} />
          Sign out
        </button>

        {/* Danger zone */}
        <Section icon={<Trash2 size={15} />} title="Danger zone">
          {!deleteOpen ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-zinc-800">Delete account</p>
                <p className="text-xs text-zinc-400 mt-0.5">Permanently removes all your data</p>
              </div>
              <button
                onClick={() => setDeleteOpen(true)}
                className="px-4 py-2 rounded-xl bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 transition cursor-pointer"
              >
                Delete
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-zinc-700">
                Type <span className="font-bold text-zinc-900">{currentUsername}</span> to confirm:
              </p>
              <input
                ref={deleteInputRef}
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                className={inputCls}
                placeholder={currentUsername}
              />
              {deleteFeedback && <Feedback type={deleteFeedback.type} message={deleteFeedback.msg} />}
              <div className="flex gap-3">
                <button
                  onClick={() => { setDeleteOpen(false); setDeleteConfirm(''); }}
                  className="flex-1 py-2.5 rounded-2xl border border-zinc-200 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirm !== currentUsername || deleteLoading}
                  className="flex-1 py-2.5 rounded-2xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition disabled:opacity-40 cursor-pointer"
                >
                  {deleteLoading ? 'Deleting…' : 'Delete my account'}
                </button>
              </div>
            </div>
          )}
        </Section>

        {/* ── Household ──────────────────────────────────────────────────── */}
        <Section icon={<Home size={15} />} title="Household">
          {household === 'loading' ? (
            <p className="text-sm text-zinc-400">Loading…</p>
          ) : !household ? (
            /* No household — create one */
            <div className="flex flex-col gap-4">
              <p className="text-sm text-zinc-500 leading-relaxed">
                Create a household so family members or housemates can share the same meal plans and shopping list.
              </p>
              <Field label="Household name">
                <input
                  type="text"
                  value={newHouseholdName}
                  onChange={(e) => setNewHouseholdName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateHousehold()}
                  placeholder="e.g. The Smiths"
                  className={inputCls}
                  maxLength={60}
                />
              </Field>
              {householdFeedback && <Feedback type={householdFeedback.type} message={householdFeedback.msg} />}
              <button
                onClick={handleCreateHousehold}
                disabled={!newHouseholdName.trim() || creatingHousehold}
                className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-700 disabled:opacity-40 transition cursor-pointer"
              >
                <Home size={14} />
                {creatingHousehold ? 'Creating…' : 'Create household'}
              </button>
            </div>
          ) : (
            /* Household exists */
            <div className="flex flex-col gap-5">
              {/* Name + role */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center flex-shrink-0">
                  <Home size={18} className="text-zinc-600" />
                </div>
                <div>
                  <p className="text-base font-black text-zinc-900">{household.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {household.role === 'owner'
                      ? <><Crown size={11} className="text-amber-500" /><span className="text-xs text-zinc-400 font-medium">Owner</span></>
                      : <><Users size={11} className="text-zinc-400" /><span className="text-xs text-zinc-400 font-medium">Member · managed by <strong className="text-zinc-600">{household.ownerUsername}</strong></span></>
                    }
                  </div>
                </div>
              </div>

              {/* Members list */}
              {household.members.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Members</p>
                  <div className="flex flex-col divide-y divide-zinc-50">
                    {household.members.map((m) => (
                      <div key={m.userId} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-600">
                            {m.username[0].toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold text-zinc-800">{m.username}</span>
                        </div>
                        {household.role === 'owner' && (
                          <button
                            onClick={() => handleRemoveMember(m.userId)}
                            className="p-1 rounded-lg text-zinc-300 hover:text-red-500 hover:bg-red-50 cursor-pointer transition-colors"
                            title={`Remove ${m.username}`}
                          >
                            <UserMinus size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Invite link (owner only) */}
              {household.role === 'owner' && (
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Invite a member</p>
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      value={inviteNote}
                      onChange={(e) => setInviteNote(e.target.value)}
                      placeholder="Optional note for invitee"
                      className={inputCls}
                      maxLength={200}
                    />
                    <button
                      onClick={handleGenerateInvite}
                      disabled={generatingInvite}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-zinc-200 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 transition cursor-pointer"
                    >
                      {copiedToken ? (
                        <><Check size={14} className="text-emerald-500" /> Link copied!</>
                      ) : (
                        <><Link2 size={14} />{generatingInvite ? 'Generating…' : 'Generate & copy invite link'}</>
                      )}
                    </button>
                  </div>

                  {/* Pending invites */}
                  {household.pendingInvites.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Pending invites</p>
                      {household.pendingInvites.map((inv) => (
                        <div key={inv.token} className="flex items-center justify-between py-1.5 text-sm">
                          <div className="flex items-center gap-1.5 text-zinc-500 text-xs">
                            <UserPlus size={11} />
                            <span className="font-mono text-zinc-400">{inv.token.slice(0, 8)}…</span>
                            {inv.note && <span className="italic">"{inv.note.slice(0, 30)}"</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={async () => {
                                const url = `${window.location.origin}${inv.inviteUrl}`;
                                await navigator.clipboard.writeText(url).catch(() => {});
                                setCopiedToken(inv.token);
                                setTimeout(() => setCopiedToken(null), 2000);
                              }}
                              className="text-zinc-400 hover:text-zinc-700 cursor-pointer transition-colors"
                              title="Copy link"
                            >
                              {copiedToken === inv.token ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                            </button>
                            <button
                              onClick={() => handleRevokeInvite(inv.token)}
                              className="text-zinc-300 hover:text-red-500 cursor-pointer transition-colors"
                              title="Revoke"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {householdFeedback && <Feedback type={householdFeedback.type} message={householdFeedback.msg} />}

              {/* Leave / dissolve */}
              <button
                onClick={handleLeaveOrDissolve}
                className="flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-red-200 text-sm font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer"
              >
                <UserMinus size={14} />
                {household.role === 'owner' ? 'Dissolve household' : 'Leave household'}
              </button>
            </div>
          )}
        </Section>

      </div>
    </div>
  );
}
