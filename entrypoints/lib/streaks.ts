import { supabase } from './supabaseClient';
import type { DailyActivity } from './types';

interface DailyActivityRow {
  activity_date: string;
  save_count: number;
  restore_count: number;
  focus_count: number;
  share_count: number;
  append_count: number;
  total_score: number;
}

export interface StreakSummary {
  currentStreak: number;
  bestStreak: number;
  todayScore: number;
  days: DailyActivity[];
}

function mapDaily(row: DailyActivityRow): DailyActivity {
  return {
    activityDate: row.activity_date,
    saveCount: row.save_count,
    restoreCount: row.restore_count,
    focusCount: row.focus_count,
    shareCount: row.share_count,
    appendCount: row.append_count,
    totalScore: row.total_score,
  };
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function fetchStreakSummary(userId: string | undefined | null): Promise<StreakSummary> {
  if (!supabase || !userId) {
    return { currentStreak: 0, bestStreak: 0, todayScore: 0, days: [] };
  }

  const since = new Date();
  since.setDate(since.getDate() - 180);

  const { data, error } = await supabase
    .from('daily_activity')
    .select('*')
    .eq('user_id', userId)
    .gte('activity_date', formatDate(since))
    .order('activity_date', { ascending: true });

  if (error) {
    throw error;
  }

  const days = (data || []).map(mapDaily);
  const activeDates = new Set(days.filter((day) => day.totalScore > 0).map((day) => day.activityDate));

  let currentStreak = 0;
  const cursor = new Date();
  while (activeDates.has(formatDate(cursor))) {
    currentStreak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  let bestStreak = 0;
  let running = 0;
  for (const day of days) {
    if (day.totalScore > 0) {
      running += 1;
      bestStreak = Math.max(bestStreak, running);
    } else {
      running = 0;
    }
  }

  const todayScore = days.find((day) => day.activityDate === formatDate(new Date()))?.totalScore || 0;
  return { currentStreak, bestStreak, todayScore, days };
}
