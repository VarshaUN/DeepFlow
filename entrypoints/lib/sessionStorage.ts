import type { DeepFlowSession } from './types';

const SESSIONS_KEY = 'deepflowSessions';

interface LegacySession {
  id: number;
  note: string;
  tabs: DeepFlowSession['tabs'];
  timestamp: string;
}

function normalizeSession(session: DeepFlowSession | LegacySession): DeepFlowSession {
  if (typeof session.id === 'number') {
    return {
      id: String(session.id),
      title: session.note || 'Saved context',
      note: session.note || '',
      tabs: session.tabs || [],
      source: 'local',
      createdAt: session.timestamp || new Date(session.id).toISOString(),
    };
  }

  return {
    ...session,
    source: session.source || 'local',
  };
}

export async function loadLocalSessions(): Promise<DeepFlowSession[]> {
  const data = await chrome.storage.local.get(SESSIONS_KEY);
  return ((data[SESSIONS_KEY] || []) as Array<DeepFlowSession | LegacySession>).map(normalizeSession);
}

export async function saveLocalSessions(sessions: DeepFlowSession[]): Promise<void> {
  await chrome.storage.local.set({ [SESSIONS_KEY]: sessions });
}

export async function upsertLocalSession(session: DeepFlowSession): Promise<DeepFlowSession[]> {
  const sessions = await loadLocalSessions();
  const existingIndex = sessions.findIndex((item) => item.id === session.id);
  const updated = existingIndex >= 0
    ? sessions.map((item) => item.id === session.id ? session : item)
    : [session, ...sessions];

  await saveLocalSessions(updated);
  return updated;
}

export async function deleteLocalSession(id: string): Promise<DeepFlowSession[]> {
  const sessions = await loadLocalSessions();
  const updated = sessions.filter((session) => session.id !== id);
  await saveLocalSessions(updated);
  return updated;
}

export async function clearLocalSessions(): Promise<void> {
  await chrome.storage.local.remove(SESSIONS_KEY);
}
