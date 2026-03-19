'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
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

const BASE_SIZE_PERCENT = 0.151; // 15.1% of screen width (reduced 30% from 21.6%)

export function CanvasObject({ object, initialOffset }: CanvasObjectProps) {
  const {
    updateObjectPosition,
    updateObjectScale,
    bringToFront,
    canvasSize,
  } = usePlaygroundStore();

  const [isDragging, setIsDragging] = useState(false);
  const [isPinching, setIsPinching] = useState(false);
  const [hasAnimatedIn, setHasAnimatedIn] = useState(false);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const initialDistance = useRef<number | null>(null);
  const initialScaleRef = useRef<number>(object.scale);
  const elementRef = useRef<HTMLDivElement>(null);

  const baseSize = canvasSize.width * BASE_SIZE_PERCENT;
  
  // Calculate actual display dimensions based on image aspect ratio
  // This makes the hit target match the visible image, not a square bounding box
  let displayWidth = baseSize;
  let displayHeight = baseSize;
  
  if (imageSize) {
    const aspectRatio = imageSize.width / imageSize.height;
    if (aspectRatio > 1) {
      // Wider than tall
      displayWidth = baseSize;
      displayHeight = baseSize / aspectRatio;
    } else {
      // Taller than wide
      displayHeight = baseSize;
      displayWidth = baseSize * aspectRatio;
    }
  }
  
  const currentWidth = displayWidth * object.scale;
  const currentHeight = displayHeight * object.scale;
  
  // Calculate center position for initial animation
  const centerX = canvasSize.width / 2 - currentWidth / 2;
  const centerY = canvasSize.height / 2 - currentHeight / 2;

  // Motion values for direct manipulation (zero lag)
  const x = useMotionValue(centerX + initialOffset.x);
  const y = useMotionValue(centerY + initialOffset.y);
  const scaleValue = useMotionValue(5);
  const opacity = useMotionValue(0);

  // Entrance animation - only runs once
  useEffect(() => {
    if (!hasAnimatedIn) {
      animate(x, object.x, { type: 'spring', damping: 25, stiffness: 200 });
      animate(y, object.y, { type: 'spring', damping: 25, stiffness: 200 });
      animate(scaleValue, 1, { type: 'spring', damping: 25, stiffness: 200 });
      animate(opacity, 1, { duration: 0.3 });
      setHasAnimatedIn(true);
    }
  }, []);

  // Sync position when object position changes from store (not during drag)
  useEffect(() => {
    if (!isDragging && hasAnimatedIn) {
      x.set(object.x);
      y.set(object.y);
    }
  }, [object.x, object.y, isDragging, hasAnimatedIn]);

  // Handle drag start
  const handleDragStart = () => {
    setIsDragging(true);
    bringToFront(object.id);
    scaleValue.set(1.05);
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
  };

  // Handle drag end
  const handleDragEnd = () => {
    setIsDragging(false);
    scaleValue.set(1);
    
    const currentX = x.get();
    const currentY = y.get();
    
    // Constrain to canvas bounds using actual dimensions
    const minX = -currentWidth * 0.5;
    const maxX = canvasSize.width - currentWidth * 0.5;
    const minY = -currentHeight * 0.5;
    const maxY = canvasSize.height - currentHeight * 0.5;
    
    const constrainedX = Math.max(minX, Math.min(maxX, currentX));
    const constrainedY = Math.max(minY, Math.min(maxY, currentY));
    
    // Snap to constrained position if needed
    if (constrainedX !== currentX || constrainedY !== currentY) {
      x.set(constrainedX);
      y.set(constrainedY);
    }
    
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
        initialScaleRef.current = object.scale;
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
        const newScale = initialScaleRef.current * scaleChange;
        updateObjectScale(object.id, newScale);
        
        if (navigator.vibrate) {
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

  // Load image to get natural dimensions for tight bounding box
  useEffect(() => {
    const img = new window.Image();
    img.onload = () => {
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = object.imageSource;
  }, [object.imageSource]);

  return (
    <motion.div
      ref={elementRef}
      style={{
        position: 'absolute',
        x,
        y,
        scale: scaleValue,
        opacity,
        width: currentWidth,
        height: currentHeight,
        zIndex: object.zIndex,
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
        transformOrigin: 'center',
      }}
      drag={!isPinching}
      dragMomentum={false}
      dragElastic={0}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onTap={handleTap}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={object.imageSource}
        alt={`${object.key} is for ${object.word}`}
        className="w-full h-full object-contain pointer-events-none select-none"
        draggable={false}
      />
    </motion.div>
  );
}
