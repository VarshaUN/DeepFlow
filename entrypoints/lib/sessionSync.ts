import { supabase } from './supabaseClient';
import { mapSessionRow } from './mappers';
import type { DeepFlowSession } from './types';

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function fetchCloudSessions(ownerId: string): Promise<DeepFlowSession[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map(mapSessionRow);
}

export async function saveCloudSession(session: DeepFlowSession, ownerId: string): Promise<DeepFlowSession> {
  if (!supabase) {
    return session;
  }

  const { data, error } = await supabase
    .from('sessions')
    .upsert({
      id: isUuid(session.id) ? session.id : crypto.randomUUID(),
      owner_id: ownerId,
      title: session.title,
      note: session.note,
      tabs: session.tabs,
      parent_session_id: session.parentSessionId || null,
      source_shared_session_id: session.sourceSharedSessionId || null,
      local_created_at: session.createdAt,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return mapSessionRow(data);
}

export async function deleteCloudSession(id: string): Promise<void> {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.from('sessions').delete().eq('id', id);
  if (error) {
    throw error;
  }
}
