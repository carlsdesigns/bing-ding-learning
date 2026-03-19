'use client';

import { useCallback, useRef } from 'react';
import { usePlaygroundStore } from '@/stores/playground-store';

export function usePlaygroundTTS() {
  const {
    ttsState,
    currentUtterance,
    setTtsState,
    setCurrentUtterance,
    letterWords,
    numberWords,
    isSoundEnabled,
  } = usePlaygroundStore();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    // Cancel any in-flight fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Stop any playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    
    setTtsState('idle');
    setCurrentUtterance(null);
  }, [setTtsState, setCurrentUtterance]);

  const speak = useCallback(async (key: string) => {
    if (!isSoundEnabled) return;

    const normalizedKey = key.toUpperCase();
    const isLetter = /^[A-Z]$/.test(normalizedKey);
    const word = isLetter ? letterWords[normalizedKey] : numberWords[key];

    if (!word) return;

    // If same key is being pressed while speaking, don't interrupt
    if (ttsState === 'speaking' && currentUtterance === normalizedKey) {
      return; // Let current utterance finish
    }

    // If different key, cancel current and start new
    if (ttsState === 'speaking' && currentUtterance !== normalizedKey) {
      cancel();
    }

    const phrase = `${normalizedKey} is for ${word}!`;

    setTtsState('speaking');
    setCurrentUtterance(normalizedKey);

    try {
      // Create new abort controller
      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/voice/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: phrase }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('TTS request failed');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setTtsState('idle');
        setCurrentUtterance(null);
        audioRef.current = null;
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        setTtsState('idle');
        setCurrentUtterance(null);
        audioRef.current = null;
        // Fallback to browser speech synthesis
        fallbackSpeak(phrase);
      };

      await audio.play();
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return; // Intentionally cancelled
      }
      
      console.error('TTS error:', error);
      setTtsState('idle');
      setCurrentUtterance(null);
      
      // Fallback to browser speech synthesis
      fallbackSpeak(phrase);
    }
  }, [
    isSoundEnabled,
    letterWords,
    numberWords,
    ttsState,
    currentUtterance,
    cancel,
    setTtsState,
    setCurrentUtterance,
  ]);

  return { speak, cancel };
}

// Fallback to browser speech synthesis
function fallbackSpeak(text: string) {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    window.speechSynthesis.cancel(); // Cancel any previous
    window.speechSynthesis.speak(utterance);
  }
}
