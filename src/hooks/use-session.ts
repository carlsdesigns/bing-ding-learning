'use client';

import { useCallback } from 'react';
import { useLearningStore } from '@/stores';

export function useSession() {
  const {
    sessionId,
    learnerId,
    currentModule,
    difficulty,
    setSessionId,
  } = useLearningStore();

  const startSession = useCallback(
    async (moduleType: 'numbers' | 'alphabet') => {
      if (!learnerId) {
        throw new Error('No learner ID set');
      }

      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          learnerId,
          moduleType,
          difficulty,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start session');
      }

      const session = await response.json();
      setSessionId(session.id);
      return session;
    },
    [learnerId, difficulty, setSessionId]
  );

  const endSession = useCallback(async () => {
    if (!sessionId) return;

    const response = await fetch(`/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'end' }),
    });

    if (!response.ok) {
      throw new Error('Failed to end session');
    }

    setSessionId(null);
    return response.json();
  }, [sessionId, setSessionId]);

  const recordActivity = useCallback(
    async (activity: {
      activityType: string;
      target: string;
      correct: boolean;
      attempts?: number;
      responseTimeMs?: number;
      aiHintUsed?: boolean;
      voicePlayed?: boolean;
    }) => {
      if (!sessionId) {
        throw new Error('No active session');
      }

      const response = await fetch(`/api/sessions/${sessionId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activity),
      });

      if (!response.ok) {
        throw new Error('Failed to record activity');
      }

      return response.json();
    },
    [sessionId]
  );

  return {
    sessionId,
    isActive: !!sessionId,
    startSession,
    endSession,
    recordActivity,
  };
}
