'use client';

import { useEffect, useRef } from 'react';
import { useChildStore } from '@/stores/child-store';
import { markSessionEndForProfile } from './storage';

const IDLE_MS = 5 * 60 * 1000;

/** End open progress session when returning home (parent-facing). */
export function useEndProgressSessionOnHome(): void {
  useEffect(() => {
    const name = useChildStore.getState().childName ?? '';
    markSessionEndForProfile(name);
  }, []);
}

/** End session after 5 minutes in background (tab hidden). */
export function useProgressSessionIdleBreak(): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const childName = useChildStore((s) => s.childName);

  useEffect(() => {
    const clear = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        clear();
        timerRef.current = setTimeout(() => {
          markSessionEndForProfile(childName ?? '');
          timerRef.current = null;
        }, IDLE_MS);
      } else {
        clear();
      }
    };

    document.addEventListener('visibilitychange', onVis);
    return () => {
      clear();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [childName]);
}
