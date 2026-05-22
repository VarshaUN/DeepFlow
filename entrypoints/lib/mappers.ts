import type { DeepFlowSession, SharedSession } from './types';

interface SessionRow {
  id: string;
  owner_id: string | null;
  title: string;
  note: string | null;
  tabs: unknown;
  parent_session_id: string | null;
  source_shared_session_id: string | null;
  created_at: string;
  updated_at: string | null;
}

interface SharedSessionRow {
  id: string;
  session_id: string;
  sender_id: string;
  recipient_id: string;
  message: string | null;
  status: SharedSession['status'];
  created_at: string;
  opened_at: string | null;
  restored_at: string | null;
  sessions?: SessionRow | null;
  sender?: { email: string | null } | null;
  recipient?: { email: string | null } | null;
}

export function mapSessionRow(row: SessionRow): DeepFlowSession {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    note: row.note || '',
    tabs: Array.isArray(row.tabs) ? row.tabs as DeepFlowSession['tabs'] : [],
    parentSessionId: row.parent_session_id,
    sourceSharedSessionId: row.source_shared_session_id,
    source: 'cloud',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapSharedSessionRow(row: SharedSessionRow): SharedSession {
  return {
    id: row.id,
    sessionId: row.session_id,
    senderId: row.sender_id,
    recipientId: row.recipient_id,
    message: row.message || '',
    status: row.status,
    createdAt: row.created_at,
    openedAt: row.opened_at,
    restoredAt: row.restored_at,
    session: row.sessions ? { ...mapSessionRow(row.sessions), source: 'shared' } : undefined,
    senderEmail: row.sender?.email || undefined,
    recipientEmail: row.recipient?.email || undefined,
  };
}
