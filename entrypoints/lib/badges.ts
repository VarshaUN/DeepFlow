import { supabase } from './supabaseClient';
import type { Badge, UserBadge } from './types';

const DEFAULT_BADGES: Badge[] = [
  { key: 'first_flow', name: 'First Flow', description: 'Save your first context.', icon: 'F' },
  { key: 'back_in_flow', name: 'Back in Flow', description: 'Restore your first context.', icon: 'R' },
  { key: 'deep_work_day', name: 'Deep Work Day', description: 'Enter focus mode.', icon: 'D' },
  { key: 'context_giver', name: 'Context Giver', description: 'Share your first context.', icon: 'S' },
  { key: 'team_resumer', name: 'Team Resumer', description: 'Restore a shared context.', icon: 'T' },
  { key: 'builder', name: 'Builder', description: 'Save a shared context as your own.', icon: 'B' },
  { key: 'appender', name: 'Appender', description: 'Append tabs to a shared context.', icon: 'A' },
  { key: 'relay', name: 'Relay', description: 'Share a derived context.', icon: 'Y' },
];

export function badgeForEvent(eventType: string): string | null {
  const map: Record<string, string> = {
    save_context: 'first_flow',
    restore_context: 'back_in_flow',
    enter_focus: 'deep_work_day',
    share_context: 'context_giver',
    restore_shared_context: 'team_resumer',
    save_shared_as_own: 'builder',
    append_shared_context: 'appender',
    share_derived_context: 'relay',
  };
  return map[eventType] || null;
}

export async function unlockBadge(userId: string | undefined | null, badgeKey: string | null): Promise<void> {
  if (!supabase || !userId || !badgeKey) {
    return;
  }

  await supabase.from('user_badges').upsert({
    user_id: userId,
    badge_key: badgeKey,
  }, {
    onConflict: 'user_id,badge_key',
  });
}

export async function fetchUserBadges(userId: string | undefined | null): Promise<UserBadge[]> {
  if (!supabase || !userId) {
    return [];
  }

  const { data, error } = await supabase
    .from('user_badges')
    .select('unlocked_at, badges(*)')
    .eq('user_id', userId)
    .order('unlocked_at', { ascending: false });

  if (error) {
    return [];
  }

  return (data || []).map((row: any) => ({
    key: row.badges.key,
    name: row.badges.name,
    description: row.badges.description,
    icon: row.badges.icon,
    unlockedAt: row.unlocked_at,
  }));
}

export function fallbackBadges(): Badge[] {
  return DEFAULT_BADGES;
}
