'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TouchButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'accent' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  haptic?: boolean;
}

const variantStyles = {
  primary: 'bg-primary-500 text-white border-primary-600',
  secondary: 'bg-secondary-500 text-white border-secondary-600',
  accent: 'bg-accent-500 text-white border-accent-600',
  outline: 'bg-white text-gray-700 border-gray-300',
};

const sizeStyles = {
  sm: 'w-16 h-16 text-2xl',
  md: 'w-24 h-24 text-4xl',
  lg: 'w-32 h-32 text-5xl',
  xl: 'w-40 h-40 text-6xl',
};

export function TouchButton({
  children,
  onClick,
  className,
  disabled = false,
  variant = 'primary',
  size = 'md',
  haptic = true,
}: TouchButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  const handlePress = () => {
    if (disabled) return;

    setIsPressed(true);

    if (haptic && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }

    onClick?.();

    setTimeout(() => setIsPressed(false), 150);
  };

  return (
    <motion.button
      className={cn(
        'rounded-3xl border-4 shadow-xl font-bold touch-manipulation select-none',
        'flex items-center justify-center',
        'focus:outline-none focus:ring-4 focus:ring-primary-300',
        'transition-colors duration-200',
        variantStyles[variant],
        sizeStyles[size],
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onTouchStart={handlePress}
      onClick={handlePress}
      whileTap={{ scale: 0.9 }}
      animate={{
        scale: isPressed ? 0.95 : 1,
        boxShadow: isPressed
          ? '0 2px 8px rgba(0, 0, 0, 0.2)'
          : '0 10px 25px rgba(0, 0, 0, 0.15)',
      }}
      disabled={disabled}
    >
      {children}
    </motion.button>
  );
}
