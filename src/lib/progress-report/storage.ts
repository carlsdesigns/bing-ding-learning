import type { AttemptRecord, ProgressProfile, ProgressSession } from './types';
import { PROGRESS_PROFILES_KEY, profileStorageKey } from './types';
import { progressReportCacheStorageKey } from './insights-cache';

const SESSION_GAP_MS = 5 * 60 * 1000;
const STORAGE_WARN_BYTES = 4 * 1024 * 1024;

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function listProfileKeys(): string[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(PROGRESS_PROFILES_KEY);
  const list = safeParse<string[]>(raw);
  return Array.isArray(list) ? list : [];
}

function rememberProfileKey(key: string): void {
  const keys = new Set(listProfileKeys());
  keys.add(key);
  localStorage.setItem(PROGRESS_PROFILES_KEY, JSON.stringify(Array.from(keys)));
}

export function getProfileForDisplayName(displayName: string): ProgressProfile | null {
  if (typeof window === 'undefined') return null;
  const key = profileStorageKey(displayName);
  return safeParse<ProgressProfile>(localStorage.getItem(key));
}

export function estimateProgressStorageBytes(): number {
  if (typeof window === 'undefined') return 0;
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    if (
      k.startsWith('progress_') ||
      k === PROGRESS_PROFILES_KEY
    ) {
      total += (localStorage.getItem(k)?.length ?? 0) * 2;
    }
  }
  return total;
}

export function clearProfileData(displayName: string): void {
  if (typeof window === 'undefined') return;
  const key = profileStorageKey(displayName);
  localStorage.removeItem(key);
  localStorage.removeItem(progressReportCacheStorageKey(displayName));
  const keys = listProfileKeys().filter((k) => k !== key);
  localStorage.setItem(PROGRESS_PROFILES_KEY, JSON.stringify(keys));
}

export function markSessionEndForProfile(displayName: string): void {
  if (typeof window === 'undefined') return;
  const key = profileStorageKey(displayName);
  const profile = safeParse<ProgressProfile>(localStorage.getItem(key));
  if (!profile?.sessions?.length) return;
  const last = profile.sessions[profile.sessions.length - 1];
  if (last && !last.ended_at) {
    last.ended_at = new Date().toISOString();
    localStorage.setItem(key, JSON.stringify(profile));
  }
}

function lastAttemptTime(profile: ProgressProfile): number {
  for (let s = profile.sessions.length - 1; s >= 0; s--) {
    const attempts = profile.sessions[s].attempts;
    if (attempts.length === 0) continue;
    const t = attempts[attempts.length - 1].timestamp;
    const ms = Date.parse(t);
    if (!Number.isNaN(ms)) return ms;
  }
  return 0;
}

function needsNewSession(profile: ProgressProfile, now: number): boolean {
  if (!profile.sessions.length) return true;
  const last = profile.sessions[profile.sessions.length - 1];
  if (last.ended_at) return true;
  const lastMs = lastAttemptTime(profile);
  if (lastMs === 0) return false;
  return now - lastMs > SESSION_GAP_MS;
}

export function appendAttempt(
  displayName: string,
  attempt: AttemptRecord
): { ok: true } | { ok: false; reason: 'storage' } {
  if (typeof window === 'undefined') return { ok: false, reason: 'storage' };
  try {
    const key = profileStorageKey(displayName);
    const now = Date.now();
    const nowIso = new Date(now).toISOString();

    let profile = safeParse<ProgressProfile>(localStorage.getItem(key));
    if (!profile) {
      profile = {
        name: displayName.trim() || 'Your Child',
        displayName: displayName.trim() || '',
        created_at: nowIso,
        last_active: nowIso,
        sessions: [],
      };
      rememberProfileKey(key);
    }

    profile.displayName = displayName.trim();
    profile.name = displayName.trim() || 'Your Child';
    profile.last_active = nowIso;

    if (needsNewSession(profile, now)) {
      const open = profile.sessions[profile.sessions.length - 1];
      if (open && !open.ended_at) {
        open.ended_at = nowIso;
      }
      const session: ProgressSession = {
        session_id: `s_${now}_${Math.random().toString(36).slice(2, 9)}`,
        started_at: nowIso,
        ended_at: null,
        attempts: [],
      };
      profile.sessions.push(session);
    }

    const current = profile.sessions[profile.sessions.length - 1];
    current.attempts.push(attempt);

    localStorage.setItem(key, JSON.stringify(profile));
    return { ok: true };
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      return { ok: false, reason: 'storage' };
    }
    console.error('[progress-report] appendAttempt', e);
    return { ok: false, reason: 'storage' };
  }
}

export function storageWarningNeeded(): boolean {
  return estimateProgressStorageBytes() >= STORAGE_WARN_BYTES;
}
