'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useChildStore } from '@/stores';
import { DecorativeShapes } from '@/components/ui/decorative-shapes';

export default function HomePage() {
  const { childName, setChildName } = useChildStore();
  const [nameInput, setNameInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      setNameInput(childName);
    }
  }, [childName, isHydrated]);

  const handleSaveName = () => {
    setChildName(nameInput.trim());
    setIsEditing(false);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative">
      <DecorativeShapes />
      
      <div className="relative z-10 w-full max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-5xl md:text-7xl font-extrabold text-gray-800 mb-2 tracking-tight">
            Bing Ding
          </h1>
          <h2 className="text-3xl md:text-5xl font-bold text-lime-500 mb-6">
            Learning
          </h2>
          
          {isHydrated && childName && !isEditing ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center gap-3 mb-4"
            >
              <span className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg border-2 border-lime-200">
                <span className="text-2xl md:text-3xl font-bold text-gray-700">
                  Hi, {childName}!
                </span>
                <span className="text-3xl">👋</span>
                <button
                  onClick={() => setIsEditing(true)}
                  className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </span>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4 mb-4"
            >
              <p className="text-xl md:text-2xl text-gray-600 font-medium">What's your name?</p>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                  placeholder="Enter your name"
                  className="px-5 py-3 text-xl font-medium border-3 border-lime-300 rounded-full focus:border-lime-500 focus:outline-none focus:ring-4 focus:ring-lime-100 text-center w-52 shadow-sm bg-white"
                  autoFocus
                />
                <motion.button 
                  onClick={handleSaveName}
                  disabled={!nameInput.trim()}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-3 text-xl font-bold text-white bg-lime-500 rounded-full shadow-lg hover:bg-lime-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Go!
                </motion.button>
              </div>
            </motion.div>
          )}
          
          <p className="text-xl md:text-2xl text-gray-500 font-medium">
            Tap, play, and learn!
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Link href="/learn/numbers">
              <motion.div 
                whileHover={{ scale: 1.03, y: -4 }}
                whileTap={{ scale: 0.98 }}
                className="bg-lime-500 rounded-4xl p-6 cursor-pointer shadow-xl hover:shadow-2xl transition-shadow h-48 flex flex-col items-center justify-center relative overflow-hidden"
              >
                <div className="absolute -top-8 -right-8 w-24 h-24 bg-lime-400 rounded-full opacity-50" />
                <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-lime-600 rounded-full opacity-30" />
                <span className="text-5xl md:text-6xl font-black text-white mb-2 relative z-10 text-shadow-fun">123</span>
                <h2 className="text-xl md:text-2xl font-bold text-white relative z-10">Numbers</h2>
                <p className="text-lime-100 font-medium text-sm relative z-10">Count and learn!</p>
              </motion.div>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Link href="/learn/alphabet">
              <motion.div 
                whileHover={{ scale: 1.03, y: -4 }}
                whileTap={{ scale: 0.98 }}
                className="bg-orange-400 rounded-4xl p-6 cursor-pointer shadow-xl hover:shadow-2xl transition-shadow h-48 flex flex-col items-center justify-center relative overflow-hidden"
              >
                <div className="absolute -top-6 -left-6 w-24 h-24 bg-orange-300 rounded-full opacity-50" />
                <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-orange-500 rounded-full opacity-30" />
                <span className="text-5xl md:text-6xl font-black text-white mb-2 relative z-10 text-shadow-fun">ABC</span>
                <h2 className="text-xl md:text-2xl font-bold text-white relative z-10">Alphabet</h2>
                <p className="text-orange-100 font-medium text-sm relative z-10">Letters are fun!</p>
              </motion.div>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <Link href="/playground">
              <motion.div 
                whileHover={{ scale: 1.03, y: -4 }}
                whileTap={{ scale: 0.98 }}
                className="bg-pink-400 rounded-4xl p-6 cursor-pointer shadow-xl hover:shadow-2xl transition-shadow h-48 flex flex-col items-center justify-center relative overflow-hidden"
              >
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-pink-300 rounded-full opacity-50" />
                <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-pink-500 rounded-full opacity-30" />
                <span className="text-5xl md:text-6xl relative z-10">🎨</span>
                <h2 className="text-xl md:text-2xl font-bold text-white relative z-10">Playground</h2>
                <p className="text-pink-100 font-medium text-sm relative z-10">Create and explore!</p>
              </motion.div>
            </Link>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Link href="/reports">
            <motion.div 
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="bg-sky-400 rounded-4xl p-6 cursor-pointer shadow-xl hover:shadow-2xl transition-shadow flex items-center justify-center gap-4 relative overflow-hidden"
            >
              <div className="absolute -top-4 -right-4 w-20 h-20 bg-sky-300 rounded-full opacity-50" />
              <span className="text-4xl relative z-10">📊</span>
              <div className="relative z-10">
                <h2 className="text-xl md:text-2xl font-bold text-white">Progress Reports</h2>
                <p className="text-sky-100 font-medium">See how you're doing!</p>
              </div>
            </motion.div>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-10 flex justify-center gap-6"
        >
          <Link
            href="/settings"
            className="text-gray-400 hover:text-gray-600 text-lg font-medium transition-colors"
          >
            Settings
          </Link>
          <Link
            href="/admin/images"
            className="text-gray-400 hover:text-gray-600 text-lg font-medium transition-colors"
          >
            Image Manager
          </Link>
          <Link
            href="/admin/voice"
            className="text-gray-400 hover:text-gray-600 text-lg font-medium transition-colors"
          >
            Voice Settings
          </Link>
        </motion.div>
      </div>
    </main>
  );
}
