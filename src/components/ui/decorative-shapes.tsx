'use client';

import { motion } from 'framer-motion';

interface ShapeProps {
  className?: string;
  color: string;
  size: string;
  style?: React.CSSProperties;
}

const Circle = ({ className, color, size, style }: ShapeProps) => (
  <motion.div
    className={`rounded-full ${color} ${size} ${className}`}
    style={style}
    animate={{ 
      y: [0, -15, 0],
      rotate: [0, 5, 0]
    }}
    transition={{ 
      duration: 6, 
      repeat: Infinity, 
      ease: "easeInOut" 
    }}
  />
);

const Triangle = ({ className, color, size, style }: ShapeProps) => (
  <motion.div
    className={`${size} ${className}`}
    style={{
      ...style,
      width: 0,
      height: 0,
      borderLeft: '40px solid transparent',
      borderRight: '40px solid transparent',
      borderBottom: `70px solid`,
    }}
    animate={{ 
      y: [0, -10, 0],
      rotate: [0, -8, 0]
    }}
    transition={{ 
      duration: 5, 
      repeat: Infinity, 
      ease: "easeInOut",
      delay: 1
    }}
  />
);

const Square = ({ className, color, size, style }: ShapeProps) => (
  <motion.div
    className={`rounded-2xl ${color} ${size} ${className}`}
    style={style}
    animate={{ 
      y: [0, -12, 0],
      rotate: [15, 25, 15]
    }}
    transition={{ 
      duration: 7, 
      repeat: Infinity, 
      ease: "easeInOut",
      delay: 0.5
    }}
  />
);

const Blob = ({ className, color, size, style }: ShapeProps) => (
  <motion.div
    className={`shape-blob ${color} ${size} ${className}`}
    style={style}
    animate={{ 
      y: [0, -20, 0],
      scale: [1, 1.05, 1],
    }}
    transition={{ 
      duration: 8, 
      repeat: Infinity, 
      ease: "easeInOut",
      delay: 2
    }}
  />
);

export function DecorativeShapes() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Top right - Orange blob */}
      <Blob 
        color="bg-orange-400" 
        size="w-64 h-64 md:w-96 md:h-96" 
        className="absolute -top-20 -right-20 opacity-90"
        style={{}}
      />
      
      {/* Top left - Pink triangle */}
      <motion.div
        className="absolute top-20 left-10 md:left-20"
        animate={{ 
          y: [0, -10, 0],
          rotate: [-15, -5, -15]
        }}
        transition={{ 
          duration: 5, 
          repeat: Infinity, 
          ease: "easeInOut",
        }}
      >
        <div 
          className="w-0 h-0"
          style={{
            borderLeft: '35px solid transparent',
            borderRight: '35px solid transparent',
            borderBottom: '60px solid #FF6B9D',
          }}
        />
      </motion.div>
      
      {/* Middle right - Sky blue circle */}
      <Circle 
        color="bg-sky-400" 
        size="w-32 h-32 md:w-48 md:h-48" 
        className="absolute top-1/3 -right-10 opacity-80"
        style={{}}
      />
      
      {/* Bottom left - Yellow blob */}
      <Blob 
        color="bg-sunny-400" 
        size="w-48 h-48 md:w-72 md:h-72" 
        className="absolute -bottom-16 -left-16 opacity-90"
        style={{}}
      />
      
      {/* Bottom right - Lime green circle */}
      <Circle 
        color="bg-lime-400" 
        size="w-40 h-40 md:w-56 md:h-56" 
        className="absolute -bottom-10 right-1/4 opacity-85"
        style={{}}
      />
      
      {/* Center left - Small blue square */}
      <Square 
        color="bg-sky-400" 
        size="w-12 h-12 md:w-16 md:h-16" 
        className="absolute top-1/2 left-8 opacity-70"
        style={{}}
      />
      
      {/* Top center - Small coral circle */}
      <Circle 
        color="bg-coral-400" 
        size="w-8 h-8 md:w-12 md:h-12" 
        className="absolute top-32 left-1/3 opacity-60"
        style={{}}
      />
    </div>
  );
}

export function GameDecorativeShapes({ variant = 'default' }: { variant?: 'default' | 'numbers' | 'alphabet' }) {
  const colors = {
    default: { primary: 'bg-sky-400', secondary: 'bg-orange-400', accent: 'bg-pink-400' },
    numbers: { primary: 'bg-lime-400', secondary: 'bg-sunny-400', accent: 'bg-orange-400' },
    alphabet: { primary: 'bg-pink-400', secondary: 'bg-grape-400', accent: 'bg-sky-400' },
  };
  
  const c = colors[variant];
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <Blob 
        color={c.primary} 
        size="w-48 h-48 md:w-64 md:h-64" 
        className="absolute -top-16 -right-16 opacity-70"
        style={{}}
      />
      <Circle 
        color={c.secondary} 
        size="w-32 h-32 md:w-40 md:h-40" 
        className="absolute -bottom-10 -left-10 opacity-60"
        style={{}}
      />
      <Circle 
        color={c.accent} 
        size="w-20 h-20" 
        className="absolute top-1/4 -left-8 opacity-50"
        style={{}}
      />
    </div>
  );
}
