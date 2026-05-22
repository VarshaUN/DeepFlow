import { supabase } from './supabaseClient';
import type { ActivityEventType } from './types';

const SCORES: Record<ActivityEventType, number> = {
  save_context: 1,
  restore_context: 1,
  enter_focus: 2,
  exit_focus: 1,
  share_context: 2,
  open_shared_context: 1,
  restore_shared_context: 2,
  save_shared_as_own: 2,
  append_shared_context: 3,
  share_derived_context: 3,
};

function counterFor(eventType: ActivityEventType): 'save_count' | 'restore_count' | 'focus_count' | 'share_count' | 'append_count' | null {
  if (eventType === 'save_context' || eventType === 'save_shared_as_own') return 'save_count';
  if (eventType === 'restore_context' || eventType === 'restore_shared_context') return 'restore_count';
  if (eventType === 'enter_focus' || eventType === 'exit_focus') return 'focus_count';
  if (eventType === 'share_context' || eventType === 'share_derived_context') return 'share_count';
  if (eventType === 'append_shared_context') return 'append_count';
  return null;
}

export async function trackActivity(userId: string | undefined | null, eventType: ActivityEventType, metadata: Record<string, unknown> = {}): Promise<void> {
  if (!supabase || !userId) {
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const score = SCORES[eventType];
  const counter = counterFor(eventType);

  await supabase.from('activity_events').insert({
    user_id: userId,
    event_type: eventType,
    metadata,
  });

  const { data } = await supabase
    .from('daily_activity')
    .select('*')
    .eq('user_id', userId)
    .eq('activity_date', today)
    .maybeSingle();

  const nextRow = {
    user_id: userId,
    activity_date: today,
    save_count: data?.save_count || 0,
    restore_count: data?.restore_count || 0,
    focus_count: data?.focus_count || 0,
    share_count: data?.share_count || 0,
    append_count: data?.append_count || 0,
    total_score: (data?.total_score || 0) + score,
  };

  if (counter) {
    nextRow[counter] += 1;
  }

  await supabase.from('daily_activity').upsert(nextRow);
}
