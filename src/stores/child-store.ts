import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ChildState {
  childName: string;
  interactionCount: number;
  lastNameUsedAt: number;
}

interface ChildActions {
  setChildName: (name: string) => void;
  incrementInteraction: () => void;
  resetInteractionCount: () => void;
  shouldUseName: () => boolean;
  markNameUsed: () => void;
}

export const useChildStore = create<ChildState & ChildActions>()(
  persist(
    (set, get) => ({
      childName: '',
      interactionCount: 0,
      lastNameUsedAt: 0,

      setChildName: (childName) => set({ childName }),
      
      incrementInteraction: () => set((state) => ({ 
        interactionCount: state.interactionCount + 1 
      })),
      
      resetInteractionCount: () => set({ interactionCount: 0, lastNameUsedAt: 0 }),
      
      shouldUseName: () => {
        const state = get();
        if (!state.childName) return false;
        const interactionsSinceLastUse = state.interactionCount - state.lastNameUsedAt;
        // Use name every 4-7 interactions (randomized)
        const threshold = 4 + Math.floor(Math.random() * 4);
        return interactionsSinceLastUse >= threshold;
      },
      
      markNameUsed: () => set((state) => ({ 
        lastNameUsedAt: state.interactionCount 
      })),
    }),
    {
      name: 'bing-ding-child',
    }
  )
);
