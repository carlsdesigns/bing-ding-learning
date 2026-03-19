'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlaygroundStore, RAINBOW_COLORS } from '@/stores/playground-store';
import { WorldPickerModal } from './world-picker-modal';
import { ColorPickerModal } from './color-picker-modal';

export function DrawingToolbar() {
  const { 
    activeTool, 
    setActiveTool, 
    currentColor,
  } = usePlaygroundStore();
  
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showWorldPicker, setShowWorldPicker] = useState(false);

  return (
    <>
      <div className="mr-4 relative">
        {/* Main toolbar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-2 flex flex-col gap-2"
        >
          {/* Hand/Select tool (no drawing) */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTool('none')}
            className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-colors ${
              activeTool === 'none'
                ? 'bg-sky-500 text-white shadow-md'
                : 'hover:bg-gray-100'
            }`}
            title="Select & Move"
          >
            👆
          </motion.button>

          {/* Pen tool */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTool('pen')}
            className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-colors ${
              activeTool === 'pen'
                ? 'bg-lime-500 text-white shadow-md'
                : 'hover:bg-gray-100'
            }`}
            title="Pen"
          >
            ✏️
          </motion.button>

          {/* Highlighter tool */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTool('highlighter')}
            className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-colors ${
              activeTool === 'highlighter'
                ? 'bg-yellow-400 text-white shadow-md'
                : 'hover:bg-gray-100'
            }`}
            title="Highlighter"
          >
            🖍️
          </motion.button>

          {/* Divider */}
          <div className="w-8 h-px bg-gray-200 mx-auto" />

          {/* Color picker button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowColorPicker(true)}
            className="w-11 h-11 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors"
            title="Color"
          >
            <div
              className="w-7 h-7 rounded-full border-2 border-white shadow-md"
              style={{ backgroundColor: currentColor }}
            />
          </motion.button>

          {/* Divider */}
          <div className="w-8 h-px bg-gray-200 mx-auto" />

          {/* World selector button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowWorldPicker(true)}
            className="w-11 h-11 rounded-xl flex items-center justify-center text-xl hover:bg-gray-100 transition-colors"
            title="Choose World"
          >
            🌍
          </motion.button>
        </motion.div>
      </div>

      {/* Color picker modal */}
      <ColorPickerModal 
        isOpen={showColorPicker} 
        onClose={() => setShowColorPicker(false)} 
      />

      {/* World picker modal */}
      <WorldPickerModal 
        isOpen={showWorldPicker} 
        onClose={() => setShowWorldPicker(false)} 
      />
    </>
  );
}
