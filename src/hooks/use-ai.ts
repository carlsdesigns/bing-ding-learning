'use client';

import { useState, useCallback } from 'react';
import { useAIStore } from '@/stores';
import type { LearningContext } from '@/lib/ai/types';

export function useAI() {
  const { provider, model, setLoading, setError } = useAIStore();
  const [lastResponse, setLastResponse] = useState<string | null>(null);

  const getHint = useCallback(
    async (context: LearningContext): Promise<string> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/ai/hint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context, provider }),
        });

        if (!response.ok) {
          throw new Error('Failed to get hint');
        }

        const data = await response.json();
        setLastResponse(data.hint);
        return data.hint;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [provider, setLoading, setError]
  );

  const getEncouragement = useCallback(
    async (correct: boolean): Promise<string> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/ai/encourage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ correct, provider }),
        });

        if (!response.ok) {
          throw new Error('Failed to get encouragement');
        }

        const data = await response.json();
        setLastResponse(data.message);
        return data.message;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [provider, setLoading, setError]
  );

  const chat = useCallback(
    async (userMessage: string, systemPrompt?: string): Promise<string> => {
      setLoading(true);
      setError(null);

      try {
        const messages = [];
        if (systemPrompt) {
          messages.push({ role: 'system', content: systemPrompt });
        }
        messages.push({ role: 'user', content: userMessage });

        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages, provider, model }),
        });

        if (!response.ok) {
          throw new Error('Failed to chat');
        }

        const data = await response.json();
        setLastResponse(data.content);
        return data.content;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [provider, model, setLoading, setError]
  );

  return { getHint, getEncouragement, chat, lastResponse };
}
