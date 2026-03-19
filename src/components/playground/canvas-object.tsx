'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, PanInfo } from 'framer-motion';
import Image from 'next/image';
import { usePlaygroundStore } from '@/stores/playground-store';

interface CanvasObjectData {
  id: string;
  key: string;
  word: string;
  imageSource: string;
  x: number;
  y: number;
  scale: number;
  zIndex: number;
}

interface CanvasObjectProps {
  object: CanvasObjectData;
  initialOffset: { x: number; y: number };
}

const BASE_SIZE_PERCENT = 0.13; // 13% of screen width (30% larger than original 10%)

export function CanvasObject({ object, initialOffset }: CanvasObjectProps) {
  const {
    updateObjectPosition,
    updateObjectScale,
    bringToFront,
    canvasSize,
  } = usePlaygroundStore();

  const [isDragging, setIsDragging] = useState(false);
  const [isPinching, setIsPinching] = useState(false);
  const initialDistance = useRef<number | null>(null);
  const initialScale = useRef<number>(object.scale);
  const elementRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef({ x: object.x, y: object.y });

  const baseSize = canvasSize.width * BASE_SIZE_PERCENT;
  const currentSize = baseSize * object.scale;
  
  // Calculate center position for initial animation
  const centerX = canvasSize.width / 2 - currentSize / 2;
  const centerY = canvasSize.height / 2 - currentSize / 2;

  // Update position ref when object changes
  useEffect(() => {
    positionRef.current = { x: object.x, y: object.y };
  }, [object.x, object.y]);

  // Handle drag
  const handleDragStart = () => {
    setIsDragging(true);
    bringToFront(object.id);
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    const newX = positionRef.current.x + info.offset.x;
    const newY = positionRef.current.y + info.offset.y;
    
    // Constrain to canvas bounds (allow partial visibility at edges)
    const minX = -currentSize * 0.5;
    const maxX = canvasSize.width - currentSize * 0.5;
    const minY = -currentSize * 0.5;
    const maxY = canvasSize.height - currentSize * 0.5;
    
    const constrainedX = Math.max(minX, Math.min(maxX, newX));
    const constrainedY = Math.max(minY, Math.min(maxY, newY));
    
    updateObjectPosition(object.id, constrainedX, constrainedY);
  };

  // Handle pinch-to-zoom
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        setIsPinching(true);
        bringToFront(object.id);
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialDistance.current = Math.hypot(dx, dy);
        initialScale.current = object.scale;
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialDistance.current !== null) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const currentDistance = Math.hypot(dx, dy);
        const scaleChange = currentDistance / initialDistance.current;
        const newScale = initialScale.current * scaleChange;
        updateObjectScale(object.id, newScale);
        
        // Haptic feedback at scale thresholds
        const oldScaleStep = Math.floor(initialScale.current * 4);
        const newScaleStep = Math.floor(newScale * 4);
        if (oldScaleStep !== newScaleStep && navigator.vibrate) {
          navigator.vibrate(10);
        }
        
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleTouchEnd = () => {
      if (isPinching) {
        setIsPinching(false);
        initialDistance.current = null;
      }
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [object.id, object.scale, isPinching, updateObjectScale, bringToFront]);

  // Handle tap to bring to front
  const handleTap = () => {
    if (!isDragging && !isPinching) {
      bringToFront(object.id);
    }
  };

  return (
    <motion.div
      ref={elementRef}
      initial={{ 
        x: centerX + initialOffset.x,
        y: centerY + initialOffset.y,
        scale: 5,
        opacity: 0,
      }}
      animate={{ 
        x: object.x, 
        y: object.y,
        scale: isDragging ? 1.05 : 1,
        opacity: 1,
      }}
      exit={{
        scale: 0,
        opacity: 0,
        transition: { duration: 0.2 },
      }}
      transition={{
        type: 'spring',
        damping: 25,
        stiffness: 200,
        mass: 0.8,
      }}
      drag={!isPinching}
      dragMomentum={false}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onTap={handleTap}
      style={{
        position: 'absolute',
        width: currentSize,
        height: currentSize,
        zIndex: object.zIndex,
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
        transformOrigin: 'center',
      }}
      className="transition-transform duration-150"
    >
      <div className="relative w-full h-full">
        <Image
          src={object.imageSource}
          alt={`${object.key} is for ${object.word}`}
          fill
          className="object-contain pointer-events-none select-none drop-shadow-none"
          draggable={false}
          style={{ filter: 'none' }}
        />
      </div>
    </motion.div>
  );
}
