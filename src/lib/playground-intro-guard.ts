/**
 * Prevents overlapping playground intro TTS when React Strict Mode runs effects twice
 * or when deps fire in quick succession. Not tied to component instance lifetime.
 */
let lastPlaygroundIntroClaimAt = 0;

const DEBOUNCE_MS = 3500;

export function tryClaimPlaygroundIntroSpeech(): boolean {
  const now = Date.now();
  if (now - lastPlaygroundIntroClaimAt < DEBOUNCE_MS) {
    return false;
  }
  lastPlaygroundIntroClaimAt = now;
  return true;
}
