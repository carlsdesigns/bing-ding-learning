import prisma from './index';

export interface ProgressReport {
  learnerId: string;
  learnerName: string;
  moduleType: string;
  totalSessions: number;
  totalTimeSpentMs: number;
  itemsProgress: ItemProgress[];
  overallMastery: number;
  streakDays: number;
  recentActivity: RecentActivity[];
}

export interface ItemProgress {
  item: string;
  masteryLevel: number;
  totalAttempts: number;
  correctCount: number;
  accuracy: number;
  lastPracticed: Date | null;
}

export interface RecentActivity {
  date: Date;
  moduleType: string;
  activitiesCount: number;
  correctCount: number;
  accuracy: number;
}

export async function generateProgressReport(
  learnerId: string,
  moduleType?: string
): Promise<ProgressReport> {
  const learner = await prisma.learner.findUnique({
    where: { id: learnerId },
  });

  if (!learner) {
    throw new Error('Learner not found');
  }

  const sessions = await prisma.session.findMany({
    where: {
      learnerId,
      ...(moduleType && { moduleType }),
    },
    include: {
      activities: true,
    },
    orderBy: { startedAt: 'desc' },
  });

  const progress = await prisma.progress.findMany({
    where: {
      learnerId,
      ...(moduleType && { moduleType }),
    },
  });

  const totalTimeSpentMs = sessions.reduce((sum, s) => sum + (s.durationMs || 0), 0);

  const itemsProgress: ItemProgress[] = progress.map((p) => ({
    item: p.item,
    masteryLevel: p.masteryLevel,
    totalAttempts: p.totalAttempts,
    correctCount: p.correctCount,
    accuracy: p.totalAttempts > 0 ? (p.correctCount / p.totalAttempts) * 100 : 0,
    lastPracticed: p.lastPracticed,
  }));

  const overallMastery =
    itemsProgress.length > 0
      ? Math.round(itemsProgress.reduce((sum, p) => sum + p.masteryLevel, 0) / itemsProgress.length)
      : 0;

  const streakDays = calculateStreak(sessions.map((s) => s.startedAt));

  const recentActivity = await getRecentActivity(learnerId, 7);

  return {
    learnerId,
    learnerName: learner.name,
    moduleType: moduleType || 'all',
    totalSessions: sessions.length,
    totalTimeSpentMs,
    itemsProgress,
    overallMastery,
    streakDays,
    recentActivity,
  };
}

function calculateStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;

  const sortedDates = dates
    .map((d) => new Date(d.toDateString()))
    .sort((a, b) => b.getTime() - a.getTime());

  const uniqueDates = [...new Set(sortedDates.map((d) => d.toDateString()))].map(
    (s) => new Date(s)
  );

  let streak = 0;
  const today = new Date(new Date().toDateString());

  for (let i = 0; i < uniqueDates.length; i++) {
    const expectedDate = new Date(today);
    expectedDate.setDate(expectedDate.getDate() - i);

    if (uniqueDates[i].toDateString() === expectedDate.toDateString()) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

async function getRecentActivity(
  learnerId: string,
  days: number
): Promise<RecentActivity[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const sessions = await prisma.session.findMany({
    where: {
      learnerId,
      startedAt: { gte: startDate },
    },
    include: {
      activities: true,
    },
  });

  const activityByDate = new Map<string, RecentActivity>();

  for (const session of sessions) {
    const dateKey = session.startedAt.toDateString();
    const existing = activityByDate.get(dateKey);

    const correctCount = session.activities.filter((a) => a.correct).length;
    const totalCount = session.activities.length;

    if (existing) {
      existing.activitiesCount += totalCount;
      existing.correctCount += correctCount;
      existing.accuracy =
        existing.activitiesCount > 0
          ? (existing.correctCount / existing.activitiesCount) * 100
          : 0;
    } else {
      activityByDate.set(dateKey, {
        date: new Date(dateKey),
        moduleType: session.moduleType,
        activitiesCount: totalCount,
        correctCount,
        accuracy: totalCount > 0 ? (correctCount / totalCount) * 100 : 0,
      });
    }
  }

  return Array.from(activityByDate.values()).sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );
}

export async function getWeeklyStats(learnerId: string) {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const activities = await prisma.activity.findMany({
    where: {
      session: {
        learnerId,
        startedAt: { gte: weekAgo },
      },
    },
    include: {
      session: true,
    },
  });

  return {
    totalActivities: activities.length,
    correctAnswers: activities.filter((a) => a.correct).length,
    accuracy:
      activities.length > 0
        ? (activities.filter((a) => a.correct).length / activities.length) * 100
        : 0,
    hintsUsed: activities.filter((a) => a.aiHintUsed).length,
    voicePlays: activities.filter((a) => a.voicePlayed).length,
  };
}
