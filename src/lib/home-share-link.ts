/** Query param on `/` to prefill the child's name (share-with-friend links). */
export const HOME_CHILD_NAME_PARAM = 'name';

export const MAX_SHARED_NAME_LENGTH = 48;

export function parseChildNameFromSearch(search: string): string | null {
  const params = new URLSearchParams(
    search.startsWith('?') ? search.slice(1) : search
  );
  const raw = params.get(HOME_CHILD_NAME_PARAM);
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(raw).replace(/\+/g, ' ').trim();
    if (!decoded) return null;
    return decoded.slice(0, MAX_SHARED_NAME_LENGTH);
  } catch {
    return null;
  }
}

export function buildHomeShareUrl(childName: string): string {
  const trimmed = childName.trim().slice(0, MAX_SHARED_NAME_LENGTH);
  if (typeof window === 'undefined') {
    const path = trimmed
      ? `/?${HOME_CHILD_NAME_PARAM}=${encodeURIComponent(trimmed)}`
      : '/';
    return path;
  }
  const url = new URL(window.location.origin + '/');
  if (trimmed) url.searchParams.set(HOME_CHILD_NAME_PARAM, trimmed);
  return url.toString();
}

export function stripChildNameParamFromCurrentUrl(): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  if (!params.has(HOME_CHILD_NAME_PARAM)) return;
  params.delete(HOME_CHILD_NAME_PARAM);
  const q = params.toString();
  window.history.replaceState(
    {},
    '',
    window.location.pathname + (q ? `?${q}` : '') + window.location.hash
  );
}
