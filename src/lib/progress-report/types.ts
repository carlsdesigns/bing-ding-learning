export type ProgressGameMode = 'easy' | 'sound' | 'image';

export type ProgressItemType = 'letter' | 'number';

export interface AttemptRecord {
  mode: ProgressGameMode;
  target: string;
  type: ProgressItemType;
  options: string[];
  selected: string;
  correct: boolean;
  response_time_ms: number;
  timestamp: string;
  replayed_sound?: boolean;
  target_image?: string;
}

export interface ProgressSession {
  session_id: string;
  started_at: string;
  ended_at: string | null;
  attempts: AttemptRecord[];
}

export interface ProgressProfile {
  name: string;
  displayName: string;
  created_at: string;
  last_active: string;
  sessions: ProgressSession[];
}

export const PROGRESS_PROFILES_KEY = 'progress_profiles';
export const PROGRESS_REPORT_CACHE_PREFIX = 'progress_report_cache_';

export function profileStorageKey(displayName: string): string {
  const trimmed = displayName.trim().toLowerCase();
  const base = trimmed || 'default';
  const sanitized = base.replace(/[^a-z0-9]/g, '').slice(0, 50) || 'default';
  return `progress_${sanitized}`;
}
