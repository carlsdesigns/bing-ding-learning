'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useChildStore } from '@/stores';
import {
  getProfileForDisplayName,
  computeReportStats,
  buildGeminiPrompt,
  readCachedInsights,
  writeCachedInsights,
  parseInsightSections,
  clearProfileData,
  storageWarningNeeded,
  type LetterModeStats,
} from '@/lib/progress-report';

function ModeBlock({
  title,
  stats,
  extraLine,
}: {
  title: string;
  stats: LetterModeStats;
  extraLine?: string;
}) {
  if (stats.totalAttempts === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white/90 p-5 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-2">{title}</h3>
        <p className="text-gray-500 text-sm">No attempts in this mode yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white/90 p-5 shadow-sm space-y-3">
      <h3 className="text-lg font-bold text-gray-800">{title}</h3>
      <p className="text-2xl font-black text-sky-600">{stats.accuracyPct}%</p>
      <p className="text-sm text-gray-500">
        {stats.correct} correct of {stats.totalAttempts} · Trend:{' '}
        <span className="font-semibold text-gray-700">{stats.trend}</span>
      </p>
      {stats.mastered.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Strong ✓
          </p>
          <div className="flex flex-wrap gap-1">
            {stats.mastered.map((x: string) => (
              <span
                key={x}
                className="px-2 py-0.5 rounded-lg bg-lime-100 text-lime-900 text-sm font-bold"
              >
                {x}
              </span>
            ))}
          </div>
        </div>
      )}
      {stats.struggling.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Needs practice
          </p>
          <div className="flex flex-wrap gap-1">
            {stats.struggling.map((x: string) => (
              <span
                key={x}
                className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 text-sm font-bold"
              >
                {x}
              </span>
            ))}
          </div>
        </div>
      )}
      {stats.confusionPairs.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Often mixed up
          </p>
          <ul className="text-sm text-gray-700 space-y-1">
            {stats.confusionPairs.slice(0, 6).map((p: LetterModeStats['confusionPairs'][number]) => (
              <li key={`${p.target}-${p.picked}`}>
                Picks <strong>{p.picked}</strong> when shown <strong>{p.target}</strong> ({p.count}×)
              </li>
            ))}
          </ul>
        </div>
      )}
      {extraLine && <p className="text-sm text-gray-600">{extraLine}</p>}
    </div>
  );
}

export default function ReportsPage() {
  const childName = useChildStore((s) => s.childName);
  const [storageWarn, setStorageWarn] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSlow, setAiSlow] = useState(false);
  const [aiSections, setAiSections] = useState<ReturnType<typeof parseInsightSections> | null>(null);

  const profile = useMemo(
    () => (typeof window === 'undefined' ? null : getProfileForDisplayName(childName)),
    [childName]
  );

  const stats = useMemo(() => computeReportStats(profile), [profile]);

  useEffect(() => {
    setStorageWarn(storageWarningNeeded());
  }, [profile, stats?.totalAttempts]);

  const loadInsights = useCallback(async () => {
    if (!stats || stats.totalAttempts === 0) return;
    setAiError(null);
    setAiSlow(false);

    const cached = readCachedInsights(childName, stats.dataHash);
    if (cached) {
      setAiSections(parseInsightSections(cached.raw_text));
      setAiLoading(false);
      return;
    }

    setAiLoading(true);
    const slowTimer = window.setTimeout(() => setAiSlow(true), 10_000);
    try {
      const res = await fetch('/api/progress-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: buildGeminiPrompt(stats, stats.headerName),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Request failed');
      }
      const text = data.text as string;
      writeCachedInsights(childName, stats.dataHash, text);
      setAiSections(parseInsightSections(text));
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Could not load insights');
      setAiSections(null);
    } finally {
      window.clearTimeout(slowTimer);
      setAiLoading(false);
      setAiSlow(false);
    }
  }, [stats, childName]);

  useEffect(() => {
    void loadInsights();
  }, [loadInsights]);

  const dateRangeLabel = useMemo(() => {
    if (!stats?.dateRangeStart || !stats?.dateRangeEnd) return null;
    const a = new Date(stats.dateRangeStart);
    const b = new Date(stats.dateRangeEnd);
    const f = (d: Date) =>
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${f(a)} – ${f(b)}`;
  }, [stats]);

  const handleClear = () => {
    if (
      typeof window !== 'undefined' &&
      window.confirm(
        `Clear all saved quiz progress for "${childName.trim() || 'this profile'}" on this device?`
      )
    ) {
      clearProfileData(childName);
      window.location.reload();
    }
  };

  let body: ReactNode;

  if (!stats || stats.totalAttempts === 0) {
      body = (
        <div className="text-center rounded-3xl bg-white/90 border border-gray-100 shadow-lg p-10">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No quiz data yet</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Play the letter and number matching games to start tracking. Free play on the
            playground is not scored here.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/learn/alphabet"
              className="px-6 py-3 rounded-full bg-orange-400 text-white font-bold shadow-md hover:bg-orange-500"
            >
              Alphabet
            </Link>
            <Link
              href="/learn/numbers"
              className="px-6 py-3 rounded-full bg-lime-500 text-white font-bold shadow-md hover:bg-lime-600"
            >
              Numbers
            </Link>
          </div>
        </div>
      );
    } else {
      body = (
        <div className="space-y-8">
          <div className="rounded-3xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-800">Coach notes</h2>
            {aiLoading && (
              <div className="space-y-3 animate-pulse">
                <div className="h-4 bg-purple-200/60 rounded w-full" />
                <div className="h-4 bg-purple-200/60 rounded w-5/6" />
                <div className="h-4 bg-purple-200/60 rounded w-4/6" />
                {aiSlow && (
                  <p className="text-sm text-purple-800 pt-2">Taking longer than usual…</p>
                )}
              </div>
            )}
            {!aiLoading && aiError && (
              <div className="space-y-3">
                <p className="text-gray-700">
                  Couldn&apos;t generate personalized insights right now. The detailed stats below
                  are still up to date.
                </p>
                <p className="text-sm text-gray-500">{aiError}</p>
                <button
                  type="button"
                  onClick={() => void loadInsights()}
                  className="px-4 py-2 rounded-full bg-purple-500 text-white font-bold text-sm hover:bg-purple-600"
                >
                  Try again
                </button>
              </div>
            )}
            {!aiLoading && !aiError && aiSections && (
              <div className="space-y-5 text-gray-800">
                {aiSections.summary && (
                  <section>
                    <h3 className="text-sm font-bold text-purple-900 uppercase tracking-wide mb-2">
                      Summary
                    </h3>
                    <p className="whitespace-pre-wrap leading-relaxed">{aiSections.summary}</p>
                  </section>
                )}
                {aiSections.focus && (
                  <section>
                    <h3 className="text-sm font-bold text-purple-900 uppercase tracking-wide mb-2">
                      Focus areas
                    </h3>
                    <p className="whitespace-pre-wrap leading-relaxed">{aiSections.focus}</p>
                  </section>
                )}
                {aiSections.activities && (
                  <section>
                    <h3 className="text-sm font-bold text-purple-900 uppercase tracking-wide mb-2">
                      Try at home
                    </h3>
                    <p className="whitespace-pre-wrap leading-relaxed">{aiSections.activities}</p>
                  </section>
                )}
                {aiSections.context && (
                  <section>
                    <h3 className="text-sm font-bold text-purple-900 uppercase tracking-wide mb-2">
                      Context & encouragement
                    </h3>
                    <p className="whitespace-pre-wrap leading-relaxed">{aiSections.context}</p>
                  </section>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Sessions', value: stats.totalSessions },
              { label: 'Quiz answers', value: stats.totalAttempts },
              { label: 'Last active', value: stats.lastActive ? new Date(stats.lastActive).toLocaleDateString() : '—' },
              { label: 'Sessions (7 days)', value: stats.sessionsLast7Days },
            ].map((c) => (
              <div
                key={c.label}
                className="rounded-2xl bg-white/90 border border-gray-100 p-4 text-center shadow-sm"
              >
                <div className="text-2xl font-black text-sky-600">{c.value}</div>
                <div className="text-xs font-semibold text-gray-500 mt-1">{c.label}</div>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <ModeBlock title="Letters · Easy (visual)" stats={stats.letters.easy} />
            <ModeBlock title="Letters · Sound" stats={stats.letters.sound} extraLine={
              stats.letters.sound.replayedSoundLetters.length
                ? `Often re-listens before answering: ${stats.letters.sound.replayedSoundLetters.join(', ')}`
                : undefined
            } />
            <ModeBlock
              title="Letters · Pictures (object → letter)"
              stats={stats.letters.image}
              extraLine={
                stats.letters.image.pairStats.length
                  ? `Weaker links: ${stats.letters.image.pairStats
                      .filter((p) => p.accuracyPct < 50 && p.attempts >= 2)
                      .slice(0, 4)
                      .map((p) => `${p.word}→${p.target}`)
                      .join(', ') || '—'}`
                  : undefined
              }
            />
            <ModeBlock title="Numbers · Visual" stats={stats.numbers.easy} />
            <ModeBlock title="Numbers · Pictures" stats={stats.numbers.image} />
          </div>

          <p className="text-xs text-gray-500 text-center max-w-xl mx-auto">
            Privacy: progress stays on this device. Only summary stats and your child&apos;s first
            name are sent to our AI to write these notes—not photos or full transcripts.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={handleClear}
              className="px-5 py-2 rounded-full border-2 border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50"
            >
              Clear data for this name
            </button>
          </div>
        </div>
      );
  }

  return (
    <main className="min-h-screen p-4 md:p-8 bg-[#fff9fc]">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="text-gray-500 hover:text-gray-700 font-medium text-lg"
          >
            ← Home
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 mb-2">
            Progress report
          </h1>
          <p className="text-xl font-bold text-sky-600">
            {stats?.headerName ?? (childName.trim() || 'Your child')}
          </p>
          {dateRangeLabel && (
            <p className="text-gray-500 mt-1">{dateRangeLabel}</p>
          )}
          <p className="text-sm text-gray-500 mt-2">
            For parents — your child doesn&apos;t need to see this screen.
          </p>
        </motion.div>

        {storageWarn && (
          <div className="mb-6 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm p-4">
            Storage is getting full. You can clear old data below for names you don&apos;t use
            anymore.
          </div>
        )}

        {body}
      </div>
    </main>
  );
}
