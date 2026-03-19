'use client';

import { useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlaygroundStore } from '@/stores/playground-store';
import { CanvasObject } from './canvas-object';

// Generate random offset from center (100-400px in random direction)
function generateRandomOffset(): { x: number; y: number } {
  const distance = 100 + Math.random() * 300; // 100-400px
  const angle = Math.random() * 2 * Math.PI; // Random angle
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
  };
}

export function PlaygroundCanvas() {
  const {
    canvasObjects,
    isSoundEnabled,
    toggleSound,
    clearCanvas,
    setCanvasSize,
  } = usePlaygroundStore();

  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Store random offsets for each object (keyed by object id)
  const offsetsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  
  // Get or create offset for an object
  const getOffset = (id: string) => {
    if (!offsetsRef.current.has(id)) {
      offsetsRef.current.set(id, generateRandomOffset());
    }
    return offsetsRef.current.get(id)!;
  };

  // Track canvas size
  useEffect(() => {
    const updateSize = () => {
      if (canvasRef.current) {
        const { width, height } = canvasRef.current.getBoundingClientRect();
        setCanvasSize(width, height);
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [setCanvasSize]);

  const handleClear = () => {
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
    // Clear stored offsets
    offsetsRef.current.clear();
    clearCanvas();
  };

  return (
    <div 
      ref={canvasRef}
      className="absolute inset-0 bg-stone-100 overflow-hidden"
    >
      {/* Canvas background pattern */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle, #d4d4d4 1px, transparent 1px)`,
          backgroundSize: '20px 20px',
        }}
      />

      {/* Canvas objects */}
      <AnimatePresence>
        {canvasObjects.map((obj) => (
          <CanvasObject 
            key={obj.id} 
            object={obj} 
            initialOffset={getOffset(obj.id)}
          />
        ))}
      </AnimatePresence>

      {/* Floating overlay buttons - top right */}
      <div className="absolute top-4 right-4 flex gap-2 z-20">
        {/* Sound toggle */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleSound}
          className="w-12 h-12 bg-white/80 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-white transition-colors"
          title={isSoundEnabled ? 'Mute sound' : 'Enable sound'}
        >
          {isSoundEnabled ? '🔊' : '🔇'}
        </motion.button>

        {/* Clear canvas */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleClear}
          className="w-12 h-12 bg-white/80 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-white transition-colors"
          title="Clear canvas"
        >
          🗑️
        </motion.button>
      </div>

      {/* Empty state hint */}
      {canvasObjects.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <p className="text-2xl text-gray-400 font-medium text-center px-8">
            Press a letter to start playing!
          </p>
        </motion.div>
      )}
    </div>
  );
}
