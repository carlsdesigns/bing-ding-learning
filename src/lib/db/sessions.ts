import prisma from './index';
import type { Session, Activity, Progress } from '@prisma/client';

export interface CreateSessionInput {
  learnerId: string;
  moduleType: 'numbers' | 'alphabet';
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface RecordActivityInput {
  sessionId: string;
  activityType: string;
  target: string;
  correct: boolean;
  attempts?: number;
  responseTimeMs?: number;
  aiHintUsed?: boolean;
  voicePlayed?: boolean;
}

export async function createSession(input: CreateSessionInput): Promise<Session> {
  return prisma.session.create({
    data: {
      learnerId: input.learnerId,
      moduleType: input.moduleType,
      difficulty: input.difficulty || 'easy',
    },
  });
}

export async function endSession(sessionId: string): Promise<Session> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new Error('Session not found');
  }

  const endedAt = new Date();
  const durationMs = endedAt.getTime() - session.startedAt.getTime();

  return prisma.session.update({
    where: { id: sessionId },
    data: {
      endedAt,
      durationMs,
    },
  });
}

export async function recordActivity(input: RecordActivityInput): Promise<Activity> {
  const activity = await prisma.activity.create({
    data: {
      sessionId: input.sessionId,
      activityType: input.activityType,
      target: input.target,
      correct: input.correct,
      attempts: input.attempts || 1,
      responseTimeMs: input.responseTimeMs,
      aiHintUsed: input.aiHintUsed || false,
      voicePlayed: input.voicePlayed || false,
    },
    include: {
      session: true,
    },
  });

  await updateProgress(
    activity.session.learnerId,
    activity.session.moduleType,
    input.target,
    input.correct
  );

  return activity;
}

async function updateProgress(
  learnerId: string,
  moduleType: string,
  item: string,
  correct: boolean
): Promise<Progress> {
  const existing = await prisma.progress.findUnique({
    where: {
      learnerId_moduleType_item: {
        learnerId,
        moduleType,
        item,
      },
    },
  });

  if (existing) {
    const newCorrectCount = correct ? existing.correctCount + 1 : existing.correctCount;
    const newTotalAttempts = existing.totalAttempts + 1;
    const newMasteryLevel = Math.min(100, Math.round((newCorrectCount / newTotalAttempts) * 100));

    return prisma.progress.update({
      where: { id: existing.id },
      data: {
        correctCount: newCorrectCount,
        totalAttempts: newTotalAttempts,
        masteryLevel: newMasteryLevel,
        lastPracticed: new Date(),
      },
    });
  }

  return prisma.progress.create({
    data: {
      learnerId,
      moduleType,
      item,
      correctCount: correct ? 1 : 0,
      totalAttempts: 1,
      masteryLevel: correct ? 100 : 0,
      lastPracticed: new Date(),
    },
  });
}

export async function getSessionWithActivities(sessionId: string) {
  return prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      activities: {
        orderBy: { createdAt: 'asc' },
      },
      learner: true,
    },
  });
}

export async function getLearnerProgress(learnerId: string, moduleType?: string) {
  return prisma.progress.findMany({
    where: {
      learnerId,
      ...(moduleType && { moduleType }),
    },
    orderBy: { item: 'asc' },
  });
}

export async function getLearnerSessions(learnerId: string, limit = 10) {
  return prisma.session.findMany({
    where: { learnerId },
    include: {
      activities: true,
    },
    orderBy: { startedAt: 'desc' },
    take: limit,
  });
}
