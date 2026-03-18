'use client';

import React from 'react';
import { motion, useDragControls, PanInfo } from 'framer-motion';
import { cn } from '@/lib/utils';

interface DraggableItemProps {
  children: React.ReactNode;
  id: string;
  onDragEnd?: (id: string, info: PanInfo) => void;
  className?: string;
  dragConstraints?: React.RefObject<HTMLElement> | { top?: number; right?: number; bottom?: number; left?: number };
}

export function DraggableItem({
  children,
  id,
  onDragEnd,
  className,
  dragConstraints,
}: DraggableItemProps) {
  const dragControls = useDragControls();

  return (
    <motion.div
      drag
      dragControls={dragControls}
      dragConstraints={dragConstraints}
      dragElastic={0.1}
      onDragEnd={(_, info) => onDragEnd?.(id, info)}
      whileDrag={{ scale: 1.1, zIndex: 50 }}
      className={cn(
        'cursor-grab active:cursor-grabbing touch-manipulation select-none',
        className
      )}
    >
      {children}
    </motion.div>
  );
}
