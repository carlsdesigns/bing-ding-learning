import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AIProvider } from '@/lib/ai/types';

interface AIState {
  provider: AIProvider;
  model: string;
  isLoading: boolean;
  lastError: string | null;
}

interface AIActions {
  setProvider: (provider: AIProvider) => void;
  setModel: (model: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const MODEL_DEFAULTS: Record<AIProvider, string> = {
  openai: 'gpt-4-turbo',
  anthropic: 'claude-3-opus-20240229',
  google: 'gemini-pro',
};

export const useAIStore = create<AIState & AIActions>()(
  persist(
    (set) => ({
      provider: 'openai',
      model: 'gpt-4-turbo',
      isLoading: false,
      lastError: null,

      setProvider: (provider) =>
        set({
          provider,
          model: MODEL_DEFAULTS[provider],
        }),

      setModel: (model) => set({ model }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (lastError) => set({ lastError }),
    }),
    {
      name: 'ai-settings',
      partialize: (state) => ({
        provider: state.provider,
        model: state.model,
      }),
    }
  )
);
