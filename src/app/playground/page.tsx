'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { KidBackButton } from '@/components/ui/kid-back-button';
import { KeyboardBar } from '@/components/playground/keyboard-bar';
import { PlaygroundCanvas } from '@/components/playground/canvas';
import { usePlaygroundStore } from '@/stores/playground-store';
import { useChildStore } from '@/stores/child-store';
import { getGameIntro } from '@/lib/game-messages';
import { useVoice } from '@/hooks';
import { tryClaimPlaygroundIntroSpeech } from '@/lib/playground-intro-guard';

export default function PlaygroundPage() {
  const { preloadImages, loadBackgrounds, isImagesLoaded, isSoundEnabled } =
    usePlaygroundStore();
  const { childName } = useChildStore();
  const { speak } = useVoice();

  useEffect(() => {
    preloadImages();
  }, [preloadImages]);

  useEffect(() => {
    if (!isImagesLoaded) return;
    void loadBackgrounds();
  }, [isImagesLoaded, loadBackgrounds]);

  useEffect(() => {
    if (!isImagesLoaded || !isSoundEnabled) return;
    if (!tryClaimPlaygroundIntroSpeech()) return;

    const introMessage = getGameIntro('playground', childName || undefined);
    let cancelled = false;

    void (async () => {
      try {
        await speak(introMessage);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to play intro:', error);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isImagesLoaded, isSoundEnabled, childName, speak]);

  if (!isImagesLoaded) {
    return (
      <main className="h-screen flex flex-col items-center justify-center bg-gradient-to-b from-sky-100 to-stone-100">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="text-4xl font-bold text-gray-600"
        >
          Loading...
        </motion.div>
      </main>
    );
  }

  return (
    <main className="h-screen flex flex-col overflow-hidden relative bg-white">
      {/* Full-screen canvas with background */}
      <div className="absolute inset-0 z-0">
        <PlaygroundCanvas />
      </div>
      
      <div className="absolute top-4 left-4 z-[300]">
        <KidBackButton />
      </div>

      {/* Spacer to push keyboard to bottom */}
      <div className="flex-1 pointer-events-none" />

      {/* Keyboard area - highest z-index (just below toolbar popups) */}
      <div className="flex-shrink-0 relative z-[300]">
        <KeyboardBar />
      </div>
    </main>
  );
}
