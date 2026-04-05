'use client';

import { useChildStore } from '@/stores/child-store';
import type { AttemptRecord, ProgressGameMode, ProgressItemType } from './types';
import { appendAttempt } from './storage';

export type { AttemptRecord, ProgressGameMode, ProgressItemType };

/**
 * Log a quiz attempt for the progress report (localStorage, name-based profile).
 * Call from alphabet/numbers after each answer. Safe no-op on server / if storage fails.
 */
export function logProgressAttempt(record: Omit<AttemptRecord, 'timestamp'> & { timestamp?: string }): void {
  if (typeof window === 'undefined') return;

  const displayName = useChildStore.getState().childName ?? '';

  const attempt: AttemptRecord = {
    ...record,
    timestamp: record.timestamp ?? new Date().toISOString(),
  };

  appendAttempt(displayName, attempt);
}

export function alphabetModeToProgressMode(
  m: 'recognition' | 'phonics' | 'pictures'
): ProgressGameMode {
  if (m === 'recognition') return 'easy';
  if (m === 'phonics') return 'sound';
  return 'image';
}

export function numbersModeToProgressMode(m: 'numeral' | 'pictures'): ProgressGameMode {
  if (m === 'numeral') return 'easy';
  return 'image';
}
