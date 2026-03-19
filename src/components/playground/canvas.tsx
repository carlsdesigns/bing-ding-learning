'use client';

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { usePlaygroundStore } from '@/stores/playground-store';
import { CanvasObject } from './canvas-object';
import { DrawingLayer } from './drawing-layer';
import { DrawingToolbar } from './drawing-toolbar';

// Generate random offset from center (100-400px in random direction)
function generateRandomOffset(): { x: number; y: number } {
  const distance = 100 + Math.random() * 300;
  const angle = Math.random() * 2 * Math.PI;
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
    currentBackground,
    activeTool,
    penStrokes,
    highlighterStrokes,
  } = usePlaygroundStore();

  const canvasRef = useRef<HTMLDivElement>(null);
  const offsetsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  
  const getOffset = (id: string) => {
    if (!offsetsRef.current.has(id)) {
      offsetsRef.current.set(id, generateRandomOffset());
    }
    return offsetsRef.current.get(id)!;
  };

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
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
    offsetsRef.current.clear();
    clearCanvas();
  };

  const hasContent = canvasObjects.length > 0 || penStrokes.length > 0 || highlighterStrokes.length > 0;

  return (
    <div 
      ref={canvasRef}
      className="absolute inset-0 overflow-hidden"
      style={{
        cursor: activeTool !== 'none' ? 'crosshair' : 'default',
      }}
    >
      {/* Layer 0: Background */}
      {currentBackground ? (
        <div className="absolute inset-0 z-0">
          <Image
            src={currentBackground}
            alt="World background"
            fill
            className="object-cover object-bottom"
            priority
          />
        </div>
      ) : (
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-stone-100" />
          <div 
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `radial-gradient(circle, #d4d4d4 1px, transparent 1px)`,
              backgroundSize: '20px 20px',
            }}
          />
        </div>
      )}

      {/* Layer 1: All drawing strokes (BELOW objects) - pointer-events-none, never blocks */}
      <div className="absolute inset-0 z-[1] pointer-events-none">
        <DrawingLayer layer="highlighter" />
      </div>
      <div className="absolute inset-0 z-[2] pointer-events-none">
        <DrawingLayer layer="pen" />
      </div>

      {/* Layer 10+: Canvas objects/images - always interactive */}
      <div className="absolute inset-0 z-[10]">
        <AnimatePresence>
          {canvasObjects.map((obj) => (
            <CanvasObject 
              key={obj.id} 
              object={obj} 
              initialOffset={getOffset(obj.id)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Layer 100: Drawing input capture - full screen but transparent */}
      {activeTool !== 'none' && (
        <div className="absolute inset-0 z-[100]">
          <DrawingLayer layer="pen" isInputLayer />
        </div>
      )}

      {/* Layer 200: Floating overlay buttons - top right */}
      <div className="absolute top-4 right-20 flex gap-2 z-[200]">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleSound}
          className="w-12 h-12 bg-white/80 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-white transition-colors"
          title={isSoundEnabled ? 'Mute sound' : 'Enable sound'}
        >
          {isSoundEnabled ? '🔊' : '🔇'}
        </motion.button>

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

      {/* Layer 200: Drawing toolbar - right side */}
      <div className="absolute right-0 top-0 bottom-0 z-[200] flex items-center">
        <DrawingToolbar />
      </div>

      {/* Empty state hint */}
      {!hasContent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-[50]"
        >
          <p className="text-2xl text-gray-400 font-medium text-center px-8 bg-white/50 rounded-2xl py-4">
            Press a letter or draw something!
          </p>
        </motion.div>
      )}
    </div>
  );
}
