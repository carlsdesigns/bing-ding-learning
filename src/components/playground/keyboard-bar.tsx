'use client';

import { useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { usePlaygroundStore } from '@/stores/playground-store';
import { usePlaygroundTTS } from '@/hooks/use-playground-tts';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const NUMBERS = '0123456789'.split('');

const BUTTON_COLORS = [
  'bg-coral-400 hover:bg-coral-500',
  'bg-orange-400 hover:bg-orange-500',
  'bg-sunny-400 hover:bg-sunny-500',
  'bg-lime-400 hover:bg-lime-500',
  'bg-sky-400 hover:bg-sky-500',
  'bg-grape-400 hover:bg-grape-500',
  'bg-pink-400 hover:bg-pink-500',
];

function getButtonColor(index: number): string {
  return BUTTON_COLORS[index % BUTTON_COLORS.length];
}

export function KeyboardBar() {
  const { 
    keyboardMode, 
    toggleKeyboardMode,
    addCanvasObject,
    isSoundEnabled,
  } = usePlaygroundStore();

  const { speak, cancel } = usePlaygroundTTS();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleKeyPress = useCallback((key: string) => {
    // Haptic feedback (web vibration API)
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    // Always add image to canvas
    addCanvasObject(key);

    // Handle TTS with interrupt logic
    if (isSoundEnabled) {
      speak(key);
    }
  }, [addCanvasObject, isSoundEnabled, speak]);

  // Physical keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      
      // Handle letters A-Z
      if (/^[A-Z]$/.test(key)) {
        handleKeyPress(key);
        return;
      }
      
      // Handle numbers 0-9 (hidden support even in letter mode)
      if (/^[0-9]$/.test(e.key)) {
        handleKeyPress(e.key);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyPress]);

  const buttons = keyboardMode === 'letters' ? LETTERS : NUMBERS;
  const firstRow = keyboardMode === 'letters' ? LETTERS.slice(0, 13) : NUMBERS.slice(0, 5);
  const secondRow = keyboardMode === 'letters' ? LETTERS.slice(13) : NUMBERS.slice(5);

  return (
    <div className="bg-transparent">
      {/* Mobile: Single scrollable row */}
      <div className="md:hidden">
        <div className="flex items-center gap-2 p-2">
          {/* Mode toggle */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={toggleKeyboardMode}
            className="flex-shrink-0 px-3 py-3 bg-white/70 backdrop-blur-sm hover:bg-white/90 rounded-xl font-bold text-sm text-gray-700 shadow-md"
          >
            {keyboardMode === 'letters' ? '123' : 'ABC'}
          </motion.button>
          
          {/* Scrollable buttons */}
          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-x-auto flex gap-2 scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {buttons.map((key, index) => (
              <motion.button
                key={key}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleKeyPress(key)}
                className={`flex-shrink-0 w-14 h-14 ${getButtonColor(index)} rounded-2xl text-2xl font-bold text-white shadow-md active:shadow-sm transition-shadow`}
              >
                {key}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop/Tablet: Two rows */}
      <div className="hidden md:block p-3">
        <div className="flex flex-col gap-2 max-w-4xl mx-auto">
          {/* First row */}
          <div className="flex items-center justify-center gap-2">
            {/* Mode toggle */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={toggleKeyboardMode}
              className="px-4 py-3 bg-white/70 backdrop-blur-sm hover:bg-white/90 rounded-xl font-bold text-sm text-gray-700 shadow-md min-w-[56px]"
            >
              {keyboardMode === 'letters' ? '123' : 'ABC'}
            </motion.button>
            
            {firstRow.map((key, index) => (
              <motion.button
                key={key}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleKeyPress(key)}
                className={`w-12 h-12 lg:w-14 lg:h-14 ${getButtonColor(index)} rounded-2xl text-xl lg:text-2xl font-bold text-white shadow-md active:shadow-sm transition-shadow`}
              >
                {key}
              </motion.button>
            ))}
          </div>
          
          {/* Second row */}
          <div className="flex items-center justify-center gap-2">
            {/* Spacer to align with toggle */}
            <div className="w-[56px] px-4" />
            
            {secondRow.map((key, index) => (
              <motion.button
                key={key}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleKeyPress(key)}
                className={`w-12 h-12 lg:w-14 lg:h-14 ${getButtonColor(index + firstRow.length)} rounded-2xl text-xl lg:text-2xl font-bold text-white shadow-md active:shadow-sm transition-shadow`}
              >
                {key}
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
