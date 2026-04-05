import type { AttemptRecord, ProgressProfile, ProgressSession } from './types';

export interface LetterModeStats {
  totalAttempts: number;
  correct: number;
  accuracyPct: number;
  mastered: string[];
  struggling: string[];
  developing: string[];
  replayedSoundLetters: string[];
  confusionPairs: { target: string; picked: string; count: number }[];
  trend: 'improving' | 'steady' | 'declining';
}

export interface ImagePairStat {
  target: string;
  word: string;
  attempts: number;
  accuracyPct: number;
}

export interface ComputedReportStats {
  displayName: string;
  headerName: string;
  totalSessions: number;
  totalAttempts: number;
  dateRangeStart: string | null;
  dateRangeEnd: string | null;
  lastActive: string | null;
  letters: {
    easy: LetterModeStats;
    sound: LetterModeStats;
    image: LetterModeStats & { pairStats: ImagePairStat[] };
  };
  numbers: {
    easy: LetterModeStats;
    image: LetterModeStats & { pairStats: ImagePairStat[] };
  };
  avgSessionMinutes: number;
  sessionsLast7Days: number;
  dataHash: string;
}

function flattenAttempts(profile: ProgressProfile): AttemptRecord[] {
  const out: AttemptRecord[] = [];
  for (const s of profile.sessions) {
    out.push(...s.attempts);
  }
  return out;
}

function attemptsForSessions(sessions: ProgressSession[]): AttemptRecord[] {
  const out: AttemptRecord[] = [];
  for (const s of sessions) {
    out.push(...s.attempts);
  }
  return out;
}

function filterByType(attempts: AttemptRecord[], t: 'letter' | 'number'): AttemptRecord[] {
  return attempts.filter((a) => a.type === t);
}

function filterByMode(attempts: AttemptRecord[], mode: AttemptRecord['mode']): AttemptRecord[] {
  return attempts.filter((a) => a.mode === mode);
}

function computeModeStats(
  attempts: AttemptRecord[],
  includeReplay: boolean
): LetterModeStats {
  const byTarget: Record<
    string,
    { total: number; correct: number; wrongPicks: Record<string, number>; replayLetters: Set<string> }
  > = {};

  for (const a of attempts) {
    const t = a.target;
    if (!byTarget[t]) {
      byTarget[t] = { total: 0, correct: 0, wrongPicks: {}, replayLetters: new Set() };
    }
    byTarget[t].total += 1;
    if (a.correct) byTarget[t].correct += 1;
    else {
      const w = a.selected;
      byTarget[t].wrongPicks[w] = (byTarget[t].wrongPicks[w] || 0) + 1;
    }
    if (includeReplay && a.replayed_sound) {
      byTarget[t].replayLetters.add(t);
    }
  }

  const mastered: string[] = [];
  const struggling: string[] = [];
  const developing: string[] = [];
  const confusionPairs: { target: string; picked: string; count: number }[] = [];
  const replayedSoundLetters: string[] = [];

  for (const [letter, st] of Object.entries(byTarget)) {
    const acc = st.total ? (st.correct / st.total) * 100 : 0;
    if (st.total >= 5 && acc >= 80) mastered.push(letter);
    else if (st.total >= 3 && acc <= 50) struggling.push(letter);
    else developing.push(letter);

    const wrongTotal = st.total - st.correct;
    if (wrongTotal > 0 && acc < 70) {
      for (const [picked, cnt] of Object.entries(st.wrongPicks)) {
        if (cnt / wrongTotal >= 0.4) {
          confusionPairs.push({ target: letter, picked, count: cnt });
        }
      }
    }
    if (includeReplay && st.replayLetters.has(letter)) {
      replayedSoundLetters.push(letter);
    }
  }

  mastered.sort();
  struggling.sort();
  developing.sort();
  confusionPairs.sort((a, b) => b.count - a.count);

  return {
    totalAttempts: attempts.length,
    correct: attempts.filter((a) => a.correct).length,
    accuracyPct: attempts.length
      ? Math.round((attempts.filter((a) => a.correct).length / attempts.length) * 100)
      : 0,
    mastered,
    struggling,
    developing,
    replayedSoundLetters,
    confusionPairs,
    trend: 'steady',
  };
}

function sessionAccuracy(attempts: AttemptRecord[]): number {
  if (!attempts.length) return 0;
  return (attempts.filter((a) => a.correct).length / attempts.length) * 100;
}

function attachTrend(stats: LetterModeStats, sessions: ProgressSession[], mode: AttemptRecord['mode'], type: AttemptRecord['type']): void {
  const withAttempts = sessions.filter((s) =>
    s.attempts.some((a) => a.mode === mode && a.type === type)
  );
  if (withAttempts.length < 6) return;

  const recent = withAttempts.slice(-3);
  const prior = withAttempts.slice(-6, -3);
  const rAtt = attemptsForSessions(recent).filter((a) => a.mode === mode && a.type === type);
  const pAtt = attemptsForSessions(prior).filter((a) => a.mode === mode && a.type === type);
  if (rAtt.length < 3 || pAtt.length < 3) return;

  const r = sessionAccuracy(rAtt);
  const p = sessionAccuracy(pAtt);
  if (r - p >= 10) stats.trend = 'improving';
  else if (p - r >= 10) stats.trend = 'declining';
  else stats.trend = 'steady';
}

function imagePairStats(attempts: AttemptRecord[]): ImagePairStat[] {
  const by: Record<string, { word: string; total: number; correct: number }> = {};
  for (const a of attempts) {
    const word = a.target_image || a.target;
    const key = `${a.target}:${word}`;
    if (!by[key]) by[key] = { word, total: 0, correct: 0 };
    by[key].total += 1;
    if (a.correct) by[key].correct += 1;
  }
  return Object.entries(by)
    .map(([k, v]) => {
      const target = k.split(':')[0];
      return {
        target,
        word: v.word,
        attempts: v.total,
        accuracyPct: v.total ? Math.round((v.correct / v.total) * 100) : 0,
      };
    })
    .sort((a, b) => b.attempts - a.attempts);
}

export function computeReportStats(profile: ProgressProfile | null): ComputedReportStats | null {
  if (!profile) return null;

  const all = flattenAttempts(profile);
  if (!all.length) {
    return {
      displayName: profile.displayName,
      headerName: profile.name || 'Your Child',
      totalSessions: profile.sessions.length,
      totalAttempts: 0,
      dateRangeStart: null,
      dateRangeEnd: null,
      lastActive: profile.last_active,
      letters: {
        easy: emptyModeStats(),
        sound: emptyModeStats(),
        image: { ...emptyModeStats(), pairStats: [] },
      },
      numbers: {
        easy: emptyModeStats(),
        image: { ...emptyModeStats(), pairStats: [] },
      },
      avgSessionMinutes: 0,
      sessionsLast7Days: 0,
      dataHash: '0',
    };
  }

  const letterAttempts = filterByType(all, 'letter');
  const numberAttempts = filterByType(all, 'number');

  const lettersEasy = computeModeStats(filterByMode(letterAttempts, 'easy'), false);
  const lettersSound = computeModeStats(filterByMode(letterAttempts, 'sound'), true);
  const lettersImageAttempts = filterByMode(letterAttempts, 'image');
  const lettersImage = {
    ...computeModeStats(lettersImageAttempts, false),
    pairStats: imagePairStats(lettersImageAttempts),
  };

  const numsEasy = computeModeStats(filterByMode(numberAttempts, 'easy'), false);
  const numsImageAttempts = filterByMode(numberAttempts, 'image');
  const numsImage = {
    ...computeModeStats(numsImageAttempts, false),
    pairStats: imagePairStats(numsImageAttempts),
  };

  attachTrend(lettersEasy, profile.sessions, 'easy', 'letter');
  attachTrend(lettersSound, profile.sessions, 'sound', 'letter');
  attachTrend(lettersImage, profile.sessions, 'image', 'letter');
  attachTrend(numsEasy, profile.sessions, 'easy', 'number');
  attachTrend(numsImage, profile.sessions, 'image', 'number');

  const times = all.map((a) => Date.parse(a.timestamp)).filter((n) => !Number.isNaN(n));
  const minT = times.length ? new Date(Math.min(...times)).toISOString() : null;
  const maxT = times.length ? new Date(Math.max(...times)).toISOString() : null;

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const sessionsLast7Days = profile.sessions.filter((s) => {
    const t = Date.parse(s.started_at);
    return !Number.isNaN(t) && now - t < 7 * day;
  }).length;

  let totalSessionMs = 0;
  let sessionsWithEnd = 0;
  for (const s of profile.sessions) {
    if (s.ended_at) {
      const a = Date.parse(s.started_at);
      const b = Date.parse(s.ended_at);
      if (!Number.isNaN(a) && !Number.isNaN(b) && b > a) {
        totalSessionMs += b - a;
        sessionsWithEnd += 1;
      }
    }
  }
  const avgSessionMinutes =
    sessionsWithEnd > 0 ? Math.round(totalSessionMs / sessionsWithEnd / 60000) : 0;

  const dataHash = `${all.length}:${all[all.length - 1]?.timestamp ?? ''}`;

  return {
    displayName: profile.displayName,
    headerName: profile.name || 'Your Child',
    totalSessions: profile.sessions.length,
    totalAttempts: all.length,
    dateRangeStart: minT,
    dateRangeEnd: maxT,
    lastActive: profile.last_active,
    letters: {
      easy: lettersEasy,
      sound: lettersSound,
      image: lettersImage,
    },
    numbers: {
      easy: numsEasy,
      image: numsImage,
    },
    avgSessionMinutes,
    sessionsLast7Days,
    dataHash,
  };
}

function emptyModeStats(): LetterModeStats {
  return {
    totalAttempts: 0,
    correct: 0,
    accuracyPct: 0,
    mastered: [],
    struggling: [],
    developing: [],
    replayedSoundLetters: [],
    confusionPairs: [],
    trend: 'steady',
  };
}

export function buildGeminiPrompt(stats: ComputedReportStats, name: string): string {
  const fmtPairs = (pairs: LetterModeStats['confusionPairs']) =>
    pairs.length
      ? pairs.map((p) => `picks ${p.picked} when shown ${p.target} (${p.count}x)`).join('; ')
      : 'none detected';

  const ageNote = 'approximately 3 years old';

  return `You are an early childhood education specialist reviewing a young child's progress in a letter and number recognition app. The child's name is ${name} and they are ${ageNote}.

Here is their performance data:

LETTERS — EASY MODE (Visual Letter Matching):
- Total attempts: ${stats.letters.easy.totalAttempts}
- Overall accuracy: ${stats.letters.easy.accuracyPct}%
- Letters mastered (≥80% accuracy, 5+ attempts): ${stats.letters.easy.mastered.join(', ') || 'none yet'}
- Letters struggling (≤50% accuracy, 3+ attempts): ${stats.letters.easy.struggling.join(', ') || 'none yet'}
- Common confusion pairs: ${fmtPairs(stats.letters.easy.confusionPairs)}
- Trend: ${stats.letters.easy.trend}

LETTERS — SOUND MODE (Auditory Matching):
- Total attempts: ${stats.letters.sound.totalAttempts}
- Overall accuracy: ${stats.letters.sound.accuracyPct}%
- Letters mastered: ${stats.letters.sound.mastered.join(', ') || 'none yet'}
- Letters struggling: ${stats.letters.sound.struggling.join(', ') || 'none yet'}
- Letters where sound is frequently replayed before answer: ${stats.letters.sound.replayedSoundLetters.join(', ') || 'none noted'}
- Trend: ${stats.letters.sound.trend}

LETTERS — IMAGE-TO-OBJECT MODE:
- Total attempts: ${stats.letters.image.totalAttempts}
- Overall accuracy: ${stats.letters.image.accuracyPct}%
- Strongest pairs: ${stats.letters.image.pairStats.filter((p) => p.accuracyPct >= 70).map((p) => `${p.word}→${p.target}`).join(', ') || 'n/a'}
- Weakest pairs: ${stats.letters.image.pairStats.filter((p) => p.accuracyPct < 50 && p.attempts >= 2).map((p) => `${p.word}→${p.target}`).join(', ') || 'n/a'}
- Trend: ${stats.letters.image.trend}

NUMBERS — VISUAL (EASY) MODE:
- Total attempts: ${stats.numbers.easy.totalAttempts}
- Overall accuracy: ${stats.numbers.easy.accuracyPct}%
- Mastered: ${stats.numbers.easy.mastered.join(', ') || 'none yet'}
- Struggling: ${stats.numbers.easy.struggling.join(', ') || 'none yet'}
- Confusion pairs: ${fmtPairs(stats.numbers.easy.confusionPairs)}
- Trend: ${stats.numbers.easy.trend}

NUMBERS — PICTURES MODE:
- Total attempts: ${stats.numbers.image.totalAttempts}
- Overall accuracy: ${stats.numbers.image.accuracyPct}%
- Trend: ${stats.numbers.image.trend}

SESSION HISTORY:
- Total sessions: ${stats.totalSessions}
- Date range: ${stats.dateRangeStart ?? 'n/a'} to ${stats.dateRangeEnd ?? 'n/a'}
- Average session length: ${stats.avgSessionMinutes} minutes
- Sessions in last 7 days: ${stats.sessionsLast7Days}

Based on this data, respond in plain text with EXACTLY these four sections, each starting with a line that is only the section title in ALL CAPS:

SUMMARY
(2-3 warm sentences to the parent)

FOCUS AREAS
(2-3 bullet lines with - prefix, specific priorities)

RECOMMENDED ACTIVITIES  
(2-3 bullet lines with - prefix, concrete home activities)

CONTEXT AND ENCOURAGEMENT
(2-3 sentences normalizing and developmental context)

If total attempts across all modes is fewer than 20, lean on general early literacy coaching while mentioning any visible patterns. Tone: warm preschool teacher at pickup. Use the child's name.`;
}
