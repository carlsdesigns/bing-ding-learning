'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePlaygroundStore } from '@/stores/playground-store';
import { useVoice } from '@/hooks';
import { PLAYGROUND_DRAW_COLOR_SWATCHES, getPlaygroundColorName } from '@/lib/playground-colors';

interface ColorPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ColorPickerModal({ isOpen, onClose }: ColorPickerModalProps) {
  const { currentColor, setCurrentColor, isSoundEnabled } = usePlaygroundStore();
  const { speak } = useVoice();

  const handleSelectColor = (color: string) => {
    setCurrentColor(color);
    onClose();
    if (isSoundEnabled) {
      const label = getPlaygroundColorName(color);
      void speak(label === 'your color' ? 'New color!' : `${label}!`);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[400]"
            onClick={onClose}
          />

          {/* Desktop Modal - centered */}
          <div className="hidden md:flex fixed inset-0 z-[401] items-center justify-center pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl overflow-hidden pointer-events-auto p-6"
            >
              <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">
                🎨 Pick a Color!
              </h2>
              
              <div className="grid grid-cols-4 gap-4">
                {PLAYGROUND_DRAW_COLOR_SWATCHES.map(({ color, name, emoji }) => (
                  <motion.button
                    key={color}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSelectColor(color)}
                    className={`w-20 h-20 rounded-2xl shadow-lg transition-all flex items-center justify-center text-4xl ${
                      currentColor === color
                        ? 'ring-4 ring-offset-4 ring-gray-400'
                        : 'hover:shadow-xl'
                    }`}
                    style={{ backgroundColor: color }}
                  >
                    {currentColor === color && (
                      <span className="text-white drop-shadow-lg">✓</span>
                    )}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Mobile Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="md:hidden fixed inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-2xl z-[401] overflow-hidden"
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>

            <div className="px-4 pb-8">
              <h2 className="text-xl font-bold text-gray-800 text-center mb-4">
                🎨 Pick a Color!
              </h2>
              
              <div className="grid grid-cols-4 gap-3">
                {PLAYGROUND_DRAW_COLOR_SWATCHES.map(({ color, name, emoji }) => (
                  <motion.button
                    key={color}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSelectColor(color)}
                    className={`aspect-square rounded-2xl shadow-lg transition-all flex items-center justify-center text-3xl ${
                      currentColor === color
                        ? 'ring-4 ring-offset-2 ring-gray-400'
                        : ''
                    }`}
                    style={{ backgroundColor: color }}
                  >
                    {currentColor === color && (
                      <span className="text-white drop-shadow-lg">✓</span>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
