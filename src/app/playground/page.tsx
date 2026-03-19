'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { KeyboardBar } from '@/components/playground/keyboard-bar';
import { PlaygroundCanvas } from '@/components/playground/canvas';
import { usePlaygroundStore } from '@/stores/playground-store';
import { useChildStore } from '@/stores/child-store';
import { getGameIntro } from '@/lib/game-messages';

export default function PlaygroundPage() {
  const { 
    preloadImages, 
    isImagesLoaded,
    isSoundEnabled,
  } = usePlaygroundStore();
  
  const { childName } = useChildStore();
  const [hasPlayedIntro, setHasPlayedIntro] = useState(false);
  const [isPlayingIntro, setIsPlayingIntro] = useState(false);

  useEffect(() => {
    preloadImages();
  }, [preloadImages]);

  // Play intro when images are loaded
  useEffect(() => {
    const playIntro = async () => {
      if (isImagesLoaded && !hasPlayedIntro && isSoundEnabled) {
        setIsPlayingIntro(true);
        setHasPlayedIntro(true);
        
        const introMessage = getGameIntro('playground', childName || undefined);
        
        try {
          const response = await fetch('/api/voice/speak', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: introMessage }),
          });
          
          if (response.ok) {
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            
            audio.onended = () => {
              URL.revokeObjectURL(audioUrl);
              setIsPlayingIntro(false);
            };
            
            audio.onerror = () => {
              URL.revokeObjectURL(audioUrl);
              setIsPlayingIntro(false);
            };
            
            await audio.play();
          } else {
            setIsPlayingIntro(false);
          }
        } catch (error) {
          console.error('Failed to play intro:', error);
          setIsPlayingIntro(false);
        }
      }
    };
    
    playIntro();
  }, [isImagesLoaded, hasPlayedIntro, isSoundEnabled, childName]);

  if (!isImagesLoaded) {
    return (
      <main className="h-screen flex flex-col items-center justify-center bg-stone-100">
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
    <main className="h-screen flex flex-col overflow-hidden bg-stone-100">
      {/* Canvas area - 80% of screen */}
      <div className="flex-1 relative min-h-0">
        <PlaygroundCanvas />
        
        {/* Back button - top left */}
        <Link href="/" className="absolute top-4 left-4 z-20">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-md text-gray-600 font-medium hover:bg-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </motion.button>
        </Link>
      </div>

      {/* Keyboard area - max 20% of screen */}
      <div className="flex-shrink-0">
        <KeyboardBar />
      </div>
    </main>
  );
}
