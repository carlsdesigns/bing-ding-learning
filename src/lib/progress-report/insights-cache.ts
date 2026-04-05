import { profileStorageKey, PROGRESS_REPORT_CACHE_PREFIX } from './types';

const ONE_HOUR_MS = 60 * 60 * 1000;

export interface CachedInsights {
  generated_at: string;
  data_hash: string;
  raw_text: string;
}

export function progressReportCacheStorageKey(displayName: string): string {
  const slug = profileStorageKey(displayName).replace(/^progress_/, '');
  return `${PROGRESS_REPORT_CACHE_PREFIX}${slug}`;
}

export function readCachedInsights(
  displayName: string,
  currentDataHash: string
): CachedInsights | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(progressReportCacheStorageKey(displayName));
    if (!raw) return null;
    const c = JSON.parse(raw) as CachedInsights;
    if (!c.generated_at || c.data_hash !== currentDataHash) return null;
    const age = Date.now() - Date.parse(c.generated_at);
    if (Number.isNaN(age) || age > ONE_HOUR_MS) return null;
    return c;
  } catch {
    return null;
  }
}

export function writeCachedInsights(
  displayName: string,
  dataHash: string,
  rawText: string
): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: CachedInsights = {
      generated_at: new Date().toISOString(),
      data_hash: dataHash,
      raw_text: rawText,
    };
    localStorage.setItem(progressReportCacheStorageKey(displayName), JSON.stringify(payload));
  } catch {
    // quota
  }
}

export function parseInsightSections(raw: string): {
  summary: string;
  focus: string;
  activities: string;
  context: string;
} {
  const sections = {
    summary: '',
    focus: '',
    activities: '',
    context: '',
  };

  const upper = raw.toUpperCase();
  const markers = [
    { key: 'summary' as const, label: 'SUMMARY' },
    { key: 'focus' as const, label: 'FOCUS AREAS' },
    { key: 'activities' as const, label: 'RECOMMENDED ACTIVITIES' },
    { key: 'context' as const, label: 'CONTEXT AND ENCOURAGEMENT' },
  ];

  for (let i = 0; i < markers.length; i++) {
    const start = upper.indexOf(markers[i].label);
    if (start === -1) continue;
    const contentStart = start + markers[i].label.length;
    const nextStart =
      i < markers.length - 1
        ? upper.indexOf(markers[i + 1].label, contentStart)
        : raw.length;
    const slice =
      nextStart === -1
        ? raw.slice(contentStart).trim()
        : raw.slice(contentStart, nextStart).trim();
    sections[markers[i].key] = slice.replace(/^\s*[\n\r]+/, '').trim();
  }

  if (!sections.summary && raw.trim()) {
    sections.summary = raw.trim();
  }

  return sections;
}
