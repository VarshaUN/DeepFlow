import { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';
import { getCurrentProfile, sendPasswordReset, signIn, signOut, signUp } from '../lib/auth';
import { badgeForEvent, fallbackBadges, fetchUserBadges, unlockBadge } from '../lib/badges';
import {
  buildDerivedSession,
  fetchIncomingShares,
  fetchSentShares,
  markSharedSession,
  shareSessionByEmail,
} from '../lib/collaboration';
import { deleteLocalSession, loadLocalSessions, saveLocalSessions, upsertLocalSession } from '../lib/sessionStorage';
import { deleteCloudSession, fetchCloudSessions, saveCloudSession } from '../lib/sessionSync';
import { hasSupabaseConfig, supabase } from '../lib/supabaseClient';
import { captureCurrentTabs, getDefaultSessionTitle } from '../lib/tabCapture';
import { trackActivity } from '../lib/activityTracking';
import { fetchStreakSummary, type StreakSummary } from '../lib/streaks';
import type { ActivityEventType, Badge, DeepFlowSession, Profile, SharedSession, UserBadge } from '../lib/types';

type View = 'contexts' | 'shared' | 'streaks' | 'account';
type AuthMode = 'sign-in' | 'sign-up';

const emptyStreak: StreakSummary = {
  currentStreak: 0,
  bestStreak: 0,
  todayScore: 0,
  days: [],
};

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function contributionClass(score: number): string {
  if (score >= 10) return 'level-4';
  if (score >= 6) return 'level-3';
  if (score >= 3) return 'level-2';
  if (score >= 1) return 'level-1';
  return 'level-0';
}

function lastGridDays(days: StreakSummary['days']): Array<{ date: string; score: number }> {
  const byDate = new Map(days.map((day) => [day.activityDate, day.totalScore]));
  return Array.from({ length: 84 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (83 - index));
    const key = date.toISOString().slice(0, 10);
    return { date: key, score: byDate.get(key) || 0 };
  });
}

function App() {
  const [view, setView] = useState<View>('contexts');
  const [authMode, setAuthMode] = useState<AuthMode>('sign-in');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [sessions, setSessions] = useState<DeepFlowSession[]>([]);
  const [incomingShares, setIncomingShares] = useState<SharedSession[]>([]);
  const [sentShares, setSentShares] = useState<SharedSession[]>([]);
  const [streak, setStreak] = useState<StreakSummary>(emptyStreak);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [note, setNote] = useState('');
  const [shareTarget, setShareTarget] = useState<DeepFlowSession | null>(null);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [isInFocus, setIsInFocus] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');

  const availableBadges: Badge[] = useMemo(() => fallbackBadges(), []);

  const refreshCloudData = useCallback(async (currentProfile: Profile | null) => {
    if (!currentProfile) {
      return;
    }

    const [cloudSessions, incoming, sent, streakSummary, badges] = await Promise.all([
      fetchCloudSessions(currentProfile.id),
      fetchIncomingShares(currentProfile.id),
      fetchSentShares(currentProfile.id),
      fetchStreakSummary(currentProfile.id),
      fetchUserBadges(currentProfile.id),
    ]);

    setSessions(cloudSessions);
    await saveLocalSessions(cloudSessions);
    setIncomingShares(incoming);
    setSentShares(sent);
    setStreak(streakSummary);
    setUserBadges(badges);
  }, []);

  const refreshProfile = useCallback(async () => {
    const currentProfile = await getCurrentProfile();
    setProfile(currentProfile);

    const localSessions = await loadLocalSessions();
    setSessions(localSessions);

    if (currentProfile) {
      await refreshCloudData(currentProfile);
    }
  }, [refreshCloudData]);

  useEffect(() => {
    refreshProfile().catch((error) => setStatus(error.message));
  }, [refreshProfile]);

  useEffect(() => {
    if (!supabase || !profile) {
      return;
    }

    const channel = supabase
      .channel(`deepflow-shares-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shared_sessions',
          filter: `recipient_id=eq.${profile.id}`,
        },
        () => {
          refreshCloudData(profile).catch((error) => setStatus(error.message));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, refreshCloudData]);

  const recordActivity = async (eventType: ActivityEventType, metadata: Record<string, unknown> = {}) => {
    await trackActivity(profile?.id, eventType, metadata);
    await unlockBadge(profile?.id, badgeForEvent(eventType));
    if (profile) {
      const [streakSummary, badges] = await Promise.all([
        fetchStreakSummary(profile.id),
        fetchUserBadges(profile.id),
      ]);
      setStreak(streakSummary);
      setUserBadges(badges);
    }
  };

  const handleAuth = async () => {
    setIsLoading(true);
    setStatus('');
    try {
      if (authMode === 'sign-up') {
        await signUp(email, password, displayName);
        setStatus('Account created. You can sign in now.');
      } else {
        await signIn(email, password);
        setStatus('Signed in.');
      }
      await refreshProfile();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    await signOut();
    setProfile(null);
    setIncomingShares([]);
    setSentShares([]);
    setStreak(emptyStreak);
    setUserBadges([]);
    setSessions(await loadLocalSessions());
    setIsLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setStatus('Enter your email first, then request a reset link.');
      return;
    }

    setIsLoading(true);
    setStatus('');
    try {
      await sendPasswordReset(email.trim());
      setStatus('Password reset email sent.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not send reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  const createSession = async (customTitle?: string): Promise<DeepFlowSession> => {
    const tabs = await captureCurrentTabs();
    const title = note.trim() || customTitle || await getDefaultSessionTitle();
    return {
      id: crypto.randomUUID(),
      ownerId: profile?.id || null,
      title,
      note: note.trim(),
      tabs,
      source: profile ? 'cloud' : 'local',
      createdAt: new Date().toISOString(),
    };
  };

  const saveSession = async () => {
    setIsLoading(true);
    setStatus('');
    try {
      const draft = await createSession();
      const saved = profile ? await saveCloudSession(draft, profile.id) : draft;
      const updated = await upsertLocalSession(saved);
      setSessions(profile ? [saved, ...sessions.filter((session) => session.id !== saved.id)] : updated);
      setNote('');
      await recordActivity('save_context', { sessionId: saved.id });
      setStatus('Context saved.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to save context.');
    } finally {
      setIsLoading(false);
    }
  };

  const enterFocusMode = async () => {
    await saveSession();
    setIsInFocus(true);
    await recordActivity('enter_focus');
    setStatus('Focus mode active.');
  };

  const exitFocusMode = async () => {
    setIsInFocus(false);
    await recordActivity('exit_focus');
    setStatus('Focus mode ended.');
  };

  const restoreSession = async (session: DeepFlowSession, eventType: ActivityEventType = 'restore_context') => {
    setIsLoading(true);
    setStatus('');
    try {
      for (const tab of session.tabs) {
        await chrome.tabs.create({ url: tab.url });
      }
      await recordActivity(eventType, { sessionId: session.id });
      setStatus('Session restored.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to restore session.');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSession = async (session: DeepFlowSession) => {
    setIsLoading(true);
    try {
      if (profile && session.ownerId === profile.id) {
        await deleteCloudSession(session.id);
      }
      const updated = await deleteLocalSession(session.id);
      setSessions(updated);
      setStatus('Session deleted.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to delete session.');
    } finally {
      setIsLoading(false);
    }
  };

  const openShareDialog = async (session: DeepFlowSession) => {
    if (!profile) {
      setStatus('Sign in from Account before sharing contexts.');
      setView('account');
      return;
    }

    if (session.ownerId !== profile.id || session.source !== 'cloud') {
      setIsLoading(true);
      try {
        const cloudSession = await saveCloudSession({ ...session, ownerId: profile.id, source: 'cloud' }, profile.id);
        await upsertLocalSession(cloudSession);
        setShareTarget(cloudSession);
        setSessions((current) => current.map((item) => item.id === session.id ? cloudSession : item));
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Could not prepare this context for sharing.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setShareTarget(session);
  };

  const shareSession = async () => {
    if (!shareTarget || !profile) {
      setStatus('Sign in before sharing.');
      return;
    }

    setIsLoading(true);
    setStatus('');
    try {
      await shareSessionByEmail(shareTarget, profile.id, recipientEmail, shareMessage);
      const eventType: ActivityEventType = shareTarget.parentSessionId ? 'share_derived_context' : 'share_context';
      await recordActivity(eventType, { sessionId: shareTarget.id, recipientEmail });
      setShareTarget(null);
      setRecipientEmail('');
      setShareMessage('');
      await refreshCloudData(profile);
      setStatus('Context shared.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to share context.');
    } finally {
      setIsLoading(false);
    }
  };

  const openShared = async (share: SharedSession) => {
    await markSharedSession(share.id, 'opened');
    await recordActivity('open_shared_context', { sharedSessionId: share.id });
    await refreshCloudData(profile);
    setStatus('Shared context opened.');
  };

  const restoreShared = async (share: SharedSession) => {
    if (!share.session) {
      setStatus('Shared session data is missing.');
      return;
    }
    await markSharedSession(share.id, 'restored');
    await restoreSession(share.session, 'restore_shared_context');
    await refreshCloudData(profile);
  };

  const saveSharedAsOwn = async (share: SharedSession, append: boolean) => {
    if (!profile) {
      setStatus('Sign in before saving shared contexts.');
      return;
    }

    setIsLoading(true);
    setStatus('');
    try {
      const derived = await buildDerivedSession(share, profile.id, append);
      const saved = await saveCloudSession(derived, profile.id);
      await upsertLocalSession(saved);
      await recordActivity(append ? 'append_shared_context' : 'save_shared_as_own', {
        sharedSessionId: share.id,
        parentSessionId: share.sessionId,
      });
      await refreshCloudData(profile);
      setView('contexts');
      setStatus(append ? 'Appended shared context into your sessions.' : 'Saved shared context as your own.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to save shared context.');
    } finally {
      setIsLoading(false);
    }
  };

  const unlockedBadgeKeys = new Set(userBadges.map((badge) => badge.key));
  const gridDays = lastGridDays(streak.days);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <h1>DeepFlow</h1>
          <p>Save, share, resume, and build momentum.</p>
        </div>
        <button className="icon-button" onClick={() => setView('account')} disabled={isLoading} title="Account">
          {profile ? 'Me' : 'Sign in'}
        </button>
      </header>

      {!hasSupabaseConfig && (
        <section className="notice">
          Add Supabase env values to enable auth, sharing, realtime, streaks, and badges.
        </section>
      )}

      {view !== 'account' && (
        <>
          <section className={`focus-strip ${isInFocus ? 'active' : ''}`}>
            <span>{isInFocus ? 'Focus active' : 'Ready for deep work'}</span>
            <button onClick={isInFocus ? exitFocusMode : enterFocusMode} disabled={isLoading}>
              {isInFocus ? 'End' : 'Enter Focus'}
            </button>
          </section>

          <nav className="tabs">
            <button className={view === 'contexts' ? 'active' : ''} onClick={() => setView('contexts')}>Contexts</button>
            <button className={view === 'shared' ? 'active' : ''} onClick={() => setView('shared')}>Shared</button>
            <button className={view === 'streaks' ? 'active' : ''} onClick={() => setView('streaks')}>Streaks</button>
          </nav>
        </>
      )}

      {status && <p className="status">{status}</p>}

      {view === 'contexts' && (
        <section className="view-stack">
          <div className="save-row">
            <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional context note" />
            <button className="primary-button" onClick={saveSession} disabled={isLoading}>Save</button>
          </div>

          {sessions.length === 0 ? (
            <p className="empty-state">Save your first context to start building your flow.</p>
          ) : (
            sessions.map((session) => (
              <article className="session-card" key={session.id}>
                <div>
                  <h2>{session.title}</h2>
                  <p>{formatDate(session.createdAt)} · {session.tabs.length} tabs</p>
                  {session.parentSessionId && <small>Derived from a shared context</small>}
                </div>
                <div className="card-actions">
                  <button onClick={() => restoreSession(session)} disabled={isLoading}>Restore</button>
                  <button onClick={() => openShareDialog(session)} disabled={isLoading}>Share</button>
                  <button className="danger" onClick={() => deleteSession(session)} disabled={isLoading}>Delete</button>
                </div>
              </article>
            ))
          )}
        </section>
      )}

      {view === 'shared' && (
        <section className="view-stack">
          {!profile && (
            <p className="empty-state">Sign in from Account to share contexts and receive teammate sessions.</p>
          )}
          <h2 className="section-title">Shared With Me</h2>
          {incomingShares.length === 0 ? (
            <p className="empty-state">Incoming shared contexts will appear here.</p>
          ) : incomingShares.map((share) => (
            <article className="session-card" key={share.id}>
              <div>
                <h2>{share.session?.title || 'Shared context'}</h2>
                <p>From {share.senderEmail || 'teammate'} · {share.status}</p>
                {share.message && <small>{share.message}</small>}
              </div>
              <div className="card-actions">
                <button onClick={() => openShared(share)}>Open</button>
                <button onClick={() => restoreShared(share)}>Restore</button>
                <button onClick={() => saveSharedAsOwn(share, false)}>Save Mine</button>
                <button onClick={() => saveSharedAsOwn(share, true)}>Append Tabs</button>
              </div>
            </article>
          ))}

          <h2 className="section-title">Sent By Me</h2>
          {sentShares.length === 0 ? (
            <p className="empty-state">Shared contexts you send will show status here.</p>
          ) : sentShares.map((share) => (
            <article className="sent-row" key={share.id}>
              <span>{share.session?.title || 'Context'}</span>
              <small>{share.recipientEmail || 'recipient'} · {share.status}</small>
            </article>
          ))}
        </section>
      )}

      {view === 'streaks' && (
        <section className="view-stack">
          {!profile && (
            <p className="empty-state">Sign in from Account to sync streaks and badges across sessions.</p>
          )}
          <div className="metrics">
            <div><strong>{streak.currentStreak}</strong><span>Current</span></div>
            <div><strong>{streak.bestStreak}</strong><span>Best</span></div>
            <div><strong>{streak.todayScore}</strong><span>Today</span></div>
          </div>
          <div className="contribution-grid" aria-label="Contribution grid">
            {gridDays.map((day) => (
              <span className={contributionClass(day.score)} title={`${day.date}: ${day.score}`} key={day.date} />
            ))}
          </div>
          <div className="badge-grid">
            {availableBadges.map((badge) => {
              const unlocked = unlockedBadgeKeys.has(badge.key);
              return (
                <article className={`badge ${unlocked ? 'unlocked' : ''}`} key={badge.key}>
                  <strong>{badge.icon}</strong>
                  <span>{badge.name}</span>
                  <small>{unlocked ? 'Unlocked' : badge.description}</small>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {view === 'account' && (
        <section className="view-stack account-page">
          <button className="back-button" onClick={() => setView('contexts')}>Back to Focus</button>
          {profile ? (
            <section className="panel account-summary">
              <h2>Account</h2>
              <p>{profile.displayName}</p>
              <small>{profile.email}</small>
              <button className="danger" onClick={handleSignOut} disabled={isLoading}>Sign Out</button>
            </section>
          ) : (
            <section className="panel auth-panel">
              <div className="segmented">
                <button className={authMode === 'sign-in' ? 'active' : ''} onClick={() => setAuthMode('sign-in')}>Sign in</button>
                <button className={authMode === 'sign-up' ? 'active' : ''} onClick={() => setAuthMode('sign-up')}>Sign up</button>
              </div>
              {authMode === 'sign-up' && (
                <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Display name" />
              )}
              <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" />
              <div className="password-row">
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  type={showPassword ? 'text' : 'password'}
                />
                <button type="button" onClick={() => setShowPassword((value) => !value)}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <button className="primary-button" onClick={handleAuth} disabled={isLoading || !hasSupabaseConfig}>
                {authMode === 'sign-up' ? 'Create Account' : 'Sign In'}
              </button>
              {authMode === 'sign-in' && (
                <button className="link-button" onClick={handleForgotPassword} disabled={isLoading || !hasSupabaseConfig}>
                  Forgot password?
                </button>
              )}
            </section>
          )}
        </section>
      )}

      {shareTarget && (
        <div className="modal-backdrop">
          <section className="modal">
            <h2>Share Context</h2>
            <p>{shareTarget.title}</p>
            <input value={recipientEmail} onChange={(event) => setRecipientEmail(event.target.value)} placeholder="Recipient email" />
            <textarea value={shareMessage} onChange={(event) => setShareMessage(event.target.value)} placeholder="Optional message" />
            <div className="modal-actions">
              <button onClick={() => setShareTarget(null)}>Cancel</button>
              <button className="primary-button" onClick={shareSession} disabled={isLoading || !recipientEmail}>Share</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;
