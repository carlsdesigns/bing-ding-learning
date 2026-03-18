import { create } from 'zustand';

type ModuleType = 'numbers' | 'alphabet';
type Difficulty = 'easy' | 'medium' | 'hard';

interface LearningState {
  currentModule: ModuleType | null;
  currentItem: string | null;
  difficulty: Difficulty;
  sessionId: string | null;
  learnerId: string | null;
  attempts: number;
  score: number;
  streak: number;
  voiceEnabled: boolean;
  hintsEnabled: boolean;
}

interface LearningActions {
  setModule: (module: ModuleType) => void;
  setCurrentItem: (item: string) => void;
  setDifficulty: (difficulty: Difficulty) => void;
  setSessionId: (sessionId: string) => void;
  setLearnerId: (learnerId: string) => void;
  incrementAttempts: () => void;
  resetAttempts: () => void;
  addScore: (points: number) => void;
  incrementStreak: () => void;
  resetStreak: () => void;
  toggleVoice: () => void;
  toggleHints: () => void;
  resetSession: () => void;
}

export const useLearningStore = create<LearningState & LearningActions>((set) => ({
  currentModule: null,
  currentItem: null,
  difficulty: 'easy',
  sessionId: null,
  learnerId: null,
  attempts: 0,
  score: 0,
  streak: 0,
  voiceEnabled: true,
  hintsEnabled: true,

  setModule: (currentModule) => set({ currentModule }),
  setCurrentItem: (currentItem) => set({ currentItem, attempts: 0 }),
  setDifficulty: (difficulty) => set({ difficulty }),
  setSessionId: (sessionId) => set({ sessionId }),
  setLearnerId: (learnerId) => set({ learnerId }),

  incrementAttempts: () => set((state) => ({ attempts: state.attempts + 1 })),
  resetAttempts: () => set({ attempts: 0 }),

  addScore: (points) => set((state) => ({ score: state.score + points })),

  incrementStreak: () => set((state) => ({ streak: state.streak + 1 })),
  resetStreak: () => set({ streak: 0 }),

  toggleVoice: () => set((state) => ({ voiceEnabled: !state.voiceEnabled })),
  toggleHints: () => set((state) => ({ hintsEnabled: !state.hintsEnabled })),

  resetSession: () =>
    set({
      currentModule: null,
      currentItem: null,
      sessionId: null,
      attempts: 0,
      score: 0,
      streak: 0,
    }),
}));
