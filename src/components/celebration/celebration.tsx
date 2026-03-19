'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface CelebrationProps {
  show: boolean;
  type: 'letter' | 'number';
  value: string;
  onComplete?: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  delay: number;
}

interface ImageParticle {
  id: number;
  x: number;
  rotation: number;
  delay: number;
}

const CONFETTI_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8B500', '#FF69B4'
];

export function Celebration({ show, type, value, onComplete }: CelebrationProps) {
  const [confetti, setConfetti] = useState<Particle[]>([]);
  const [imageParticles, setImageParticles] = useState<ImageParticle[]>([]);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    if (show) {
      // Generate confetti particles
      const newConfetti: Particle[] = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 0.5,
        delay: Math.random() * 0.3,
      }));
      setConfetti(newConfetti);

      // Generate 16 image particles in a checkerboard pattern (4 rows x 4 per row)
      const newImageParticles: ImageParticle[] = [];
      const rows = 4;
      const perRow = 4;
      
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < perRow; col++) {
          // Checkerboard offset: shift by half a slot on alternating rows
          const baseX = (col * 25) + (row % 2 === 1 ? 12.5 : 0);
          // Add random offset of 20-100px (converted to approximate vw)
          const randomOffset = (20 + Math.random() * 80) / 10; // ~2-10vw
          const x = baseX + (Math.random() > 0.5 ? randomOffset : -randomOffset) * 0.5;
          
          newImageParticles.push({
            id: row * perRow + col,
            x: Math.max(0, Math.min(82, x)), // Keep within bounds (leaving room for 18% width)
            rotation: (Math.random() * 35 + 5) * (Math.random() > 0.5 ? 1 : -1),
            delay: row * 0.35 + col * 0.05, // Increased row stagger by 35% for more vertical spacing
          });
        }
      }
      setImageParticles(newImageParticles);

      // Try to load the specific image
      fetch(`/api/images?type=${type}&item=${type === 'letter' ? value.toUpperCase() : value}`)
        .then(res => res.json())
        .then(data => {
          if (data?.images?.length > 0) {
            setImageSrc(data.images[0].path);
          } else if (data?.selectedImage) {
            setImageSrc(data.selectedImage);
          } else {
            // No image found, skip image animation
            setImageSrc(null);
          }
        })
        .catch(() => {
          setImageSrc(null);
        });

      // Call onComplete after animation
      const timer = setTimeout(() => {
        onComplete?.();
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      setConfetti([]);
      setImageParticles([]);
    }
  }, [show, type, value, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {/* Confetti */}
          {confetti.map((particle) => (
            <motion.div
              key={`confetti-${particle.id}`}
              className="absolute w-3 h-3 rounded-sm"
              style={{
                left: `${particle.x}%`,
                backgroundColor: CONFETTI_COLORS[particle.id % CONFETTI_COLORS.length],
              }}
              initial={{ 
                y: '-10%', 
                opacity: 1, 
                rotate: 0,
                scale: particle.scale 
              }}
              animate={{ 
                y: '110vh', 
                opacity: [1, 1, 0],
                rotate: particle.rotation * 3,
              }}
              exit={{ opacity: 0 }}
              transition={{ 
                duration: 2 + Math.random(),
                delay: particle.delay,
                ease: 'linear'
              }}
            />
          ))}

          {/* 16 images rising from bottom in checkerboard pattern */}
          {imageSrc && imageParticles.map((particle) => (
            <motion.div
              key={`img-${particle.id}`}
              className="absolute"
              style={{
                left: `${particle.x}%`,
                bottom: 0,
                width: '18vw',
                height: '18vw',
              }}
              initial={{ 
                y: '100%',
                opacity: 0, 
                rotate: 0,
              }}
              animate={{ 
                y: '-150vh',
                opacity: [0, 1, 1, 1, 0],
                rotate: particle.rotation,
              }}
              exit={{ opacity: 0 }}
              transition={{ 
                duration: 4.5,
                delay: particle.delay * 1.3,
                ease: [0.25, 0.1, 0.25, 1],
                opacity: {
                  duration: 4.5,
                  times: [0, 0.1, 0.6, 0.85, 1],
                }
              }}
            >
              <Image
                src={imageSrc}
                alt=""
                fill
                className="object-contain"
                onError={() => setImageSrc(null)}
              />
            </motion.div>
          ))}

          {/* Central celebration burst */}
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.5, 1], opacity: [0, 1, 0] }}
            transition={{ duration: 0.8, times: [0, 0.3, 1] }}
          >
            <span className="text-8xl">🎉</span>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
