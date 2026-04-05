const STORAGE_KEY = 'bingding-playground-user-worlds';
const MAX_STORED = 200;

function worldUrlScore(u: string): number {
  const nums = u.match(/\d{10,}/g);
  if (!nums?.length) return 0;
  return Math.max(...nums.map((n) => parseInt(n, 10)));
}

/** Strip query/hash for deduping the same blob URL with different cache params. */
export function normalizeWorldUrlKey(url: string): string {
  try {
    const u = new URL(url);
    u.search = '';
    u.hash = '';
    return u.href.replace(/\/$/, '').toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

export function readStoredUserWorldUrls(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((u): u is string => typeof u === 'string' && u.trim().length > 0);
  } catch {
    return [];
  }
}

/** Persist a generated / selected custom world URL so it survives refresh and API gaps. */
export function rememberUserWorldUrl(url: string): void {
  if (typeof window === 'undefined' || !url.trim()) return;
  const trimmed = url.trim();
  const key = normalizeWorldUrlKey(trimmed);
  const prev = readStoredUserWorldUrls();
  const filtered = prev.filter((u) => normalizeWorldUrlKey(u) !== key);
  const next = [trimmed, ...filtered].slice(0, MAX_STORED);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

/**
 * Dedupe by normalized URL, keep first-seen canonical string, sort newest-first (timestamp in path).
 */
export function mergeWorldUrlLists(...lists: string[][]): string[] {
  const byKey = new Map<string, string>();
  for (const list of lists) {
    for (const raw of list) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const key = normalizeWorldUrlKey(trimmed);
      if (!byKey.has(key)) byKey.set(key, trimmed);
    }
  }
  const out = Array.from(byKey.values());
  out.sort((a, b) => worldUrlScore(b) - worldUrlScore(a));
  return out;
}
