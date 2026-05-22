export interface DeepFlowTab {
  url: string;
  title: string;
}

export type SessionSource = 'local' | 'cloud' | 'shared';

export interface DeepFlowSession {
  id: string;
  ownerId?: string | null;
  title: string;
  note: string;
  tabs: DeepFlowTab[];
  parentSessionId?: string | null;
  sourceSharedSessionId?: string | null;
  source: SessionSource;
  createdAt: string;
  updatedAt?: string | null;
}

export type SharedSessionStatus = 'sent' | 'opened' | 'restored';

export interface SharedSession {
  id: string;
  sessionId: string;
  senderId: string;
  recipientId: string;
  message: string;
  status: SharedSessionStatus;
  createdAt: string;
  openedAt?: string | null;
  restoredAt?: string | null;
  session?: DeepFlowSession;
  senderEmail?: string;
  recipientEmail?: string;
}

export interface Profile {
  id: string;
  email: string;
  displayName: string;
}

export type ActivityEventType =
  | 'save_context'
  | 'restore_context'
  | 'enter_focus'
  | 'exit_focus'
  | 'share_context'
  | 'open_shared_context'
  | 'restore_shared_context'
  | 'save_shared_as_own'
  | 'append_shared_context'
  | 'share_derived_context';

export interface DailyActivity {
  activityDate: string;
  saveCount: number;
  restoreCount: number;
  focusCount: number;
  shareCount: number;
  appendCount: number;
  totalScore: number;
}

export interface Badge {
  key: string;
  name: string;
  description: string;
  icon: string;
}

export interface UserBadge extends Badge {
  unlockedAt: string;
}
