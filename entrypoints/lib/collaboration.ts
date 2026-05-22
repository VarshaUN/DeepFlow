import { supabase } from './supabaseClient';
import { mapSharedSessionRow } from './mappers';
import { captureCurrentTabs, mergeTabs } from './tabCapture';
import type { DeepFlowSession, SharedSession } from './types';

export async function shareSessionByEmail(session: DeepFlowSession, senderId: string, recipientEmail: string, message: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const normalizedEmail = recipientEmail.trim().toLowerCase();
  const { data: recipient, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (!recipient?.id) {
    throw new Error('No DeepFlow user found for that email.');
  }

  const { error } = await supabase.from('shared_sessions').insert({
    session_id: session.id,
    sender_id: senderId,
    recipient_id: recipient.id,
    message,
    status: 'sent',
  });

  if (error) {
    throw error;
  }
}

export async function fetchIncomingShares(userId: string): Promise<SharedSession[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('shared_sessions')
    .select('*, sessions!shared_sessions_session_id_fkey(*), sender:profiles!shared_sessions_sender_id_fkey(email)')
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map(mapSharedSessionRow);
}

export async function fetchSentShares(userId: string): Promise<SharedSession[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('shared_sessions')
    .select('*, sessions!shared_sessions_session_id_fkey(*), recipient:profiles!shared_sessions_recipient_id_fkey(email)')
    .eq('sender_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map(mapSharedSessionRow);
}

export async function markSharedSession(sharedSessionId: string, status: 'opened' | 'restored'): Promise<void> {
  if (!supabase) {
    return;
  }

  const field = status === 'opened' ? 'opened_at' : 'restored_at';
  await supabase
    .from('shared_sessions')
    .update({ status, [field]: new Date().toISOString() })
    .eq('id', sharedSessionId);
}

export async function buildDerivedSession(shared: SharedSession, ownerId: string, appendCurrentTabs: boolean): Promise<DeepFlowSession> {
  if (!shared.session) {
    throw new Error('Shared session data is missing.');
  }

  const additions = appendCurrentTabs ? await captureCurrentTabs() : [];
  const tabs = appendCurrentTabs ? mergeTabs(shared.session.tabs, additions) : shared.session.tabs;
  const suffix = appendCurrentTabs ? ' + my additions' : ' copy';

  return {
    id: crypto.randomUUID(),
    ownerId,
    title: `${shared.session.title}${suffix}`,
    note: shared.session.note,
    tabs,
    parentSessionId: shared.session.id,
    sourceSharedSessionId: shared.id,
    source: 'cloud',
    createdAt: new Date().toISOString(),
  };
}
