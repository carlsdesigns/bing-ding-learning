'use client';

import Image from 'next/image';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { getLetterImage, getNumberImage } from '@/lib/images';
import { cn } from '@/lib/utils';

interface LearningImageProps {
  type: 'letter' | 'number';
  value: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  className?: string;
  onClick?: () => void;
}

const sizeMap = {
  sm: { width: 80, height: 80, text: 'text-sm' },
  md: { width: 120, height: 120, text: 'text-base' },
  lg: { width: 180, height: 180, text: 'text-lg' },
  xl: { width: 256, height: 256, text: 'text-xl' },
};

export function LearningImage({
  type,
  value,
  size = 'md',
  showLabel = true,
  className,
  onClick,
}: LearningImageProps) {
  const [imageError, setImageError] = useState(false);
  const imageData = type === 'letter' ? getLetterImage(value) : getNumberImage(value);
  const dimensions = sizeMap[size];

  if (!imageData) {
    return null;
  }

  const label = type === 'letter' 
    ? `${imageData.letter} is for ${(imageData as any).word}` 
    : `${(imageData as any).description}`;

  return (
    <motion.div
      className={cn(
        'flex flex-col items-center gap-2 cursor-pointer',
        className
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
    >
      <div
        className="relative rounded-2xl overflow-hidden bg-gray-100 shadow-lg"
        style={{ width: dimensions.width, height: dimensions.height }}
      >
        {!imageError ? (
          <Image
            src={imageData.image}
            alt={label}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200">
            <span className="text-4xl font-bold text-primary-600">
              {type === 'letter' ? value.toUpperCase() : value}
            </span>
          </div>
        )}
      </div>
      
      {showLabel && (
        <p className={cn('font-medium text-gray-700 text-center', dimensions.text)}>
          {label}
        </p>
      )}
    </motion.div>
  );
}
