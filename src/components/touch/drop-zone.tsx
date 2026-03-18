'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface DropZoneProps {
  children?: React.ReactNode;
  id: string;
  onDrop?: (zoneId: string) => void;
  isActive?: boolean;
  isCorrect?: boolean | null;
  className?: string;
}

export function DropZone({
  children,
  id,
  onDrop,
  isActive = false,
  isCorrect = null,
  className,
}: DropZoneProps) {
  const getBorderColor = () => {
    if (isCorrect === true) return 'border-green-500 bg-green-50';
    if (isCorrect === false) return 'border-red-500 bg-red-50';
    if (isActive) return 'border-primary-500 bg-primary-50';
    return 'border-gray-300 border-dashed';
  };

  return (
    <motion.div
      data-dropzone={id}
      className={cn(
        'rounded-3xl border-4 flex items-center justify-center min-h-[100px] transition-colors',
        getBorderColor(),
        className
      )}
      animate={{
        scale: isActive ? 1.05 : 1,
      }}
      onTouchEnd={() => onDrop?.(id)}
    >
      {children}
    </motion.div>
  );
}
