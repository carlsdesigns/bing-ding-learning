'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-5xl md:text-7xl font-bold text-gray-800 mb-4">
          Bing Ding Learning
        </h1>
        <p className="text-xl md:text-2xl text-gray-600">
          Tap, play, and learn!
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Link href="/learn/numbers">
            <Card className="hover:scale-105 transition-transform cursor-pointer bg-gradient-to-br from-primary-400 to-primary-600 border-primary-300 text-white h-64">
              <CardContent className="flex flex-col items-center justify-center h-full">
                <span className="text-8xl mb-4">123</span>
                <h2 className="text-3xl font-bold">Numbers</h2>
                <p className="text-lg opacity-90">Count and learn!</p>
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Link href="/learn/alphabet">
            <Card className="hover:scale-105 transition-transform cursor-pointer bg-gradient-to-br from-secondary-400 to-secondary-600 border-secondary-300 text-white h-64">
              <CardContent className="flex flex-col items-center justify-center h-full">
                <span className="text-8xl mb-4">ABC</span>
                <h2 className="text-3xl font-bold">Alphabet</h2>
                <p className="text-lg opacity-90">Letters are fun!</p>
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="md:col-span-2"
        >
          <Link href="/reports">
            <Card className="hover:scale-105 transition-transform cursor-pointer bg-gradient-to-br from-accent-400 to-accent-600 border-accent-300 text-white h-40">
              <CardContent className="flex flex-col items-center justify-center h-full">
                <span className="text-5xl mb-2">📊</span>
                <h2 className="text-2xl font-bold">Progress Reports</h2>
                <p className="text-lg opacity-90">See how you're doing!</p>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-12 flex gap-6"
      >
        <Link
          href="/settings"
          className="text-gray-500 hover:text-gray-700 text-lg"
        >
          Settings
        </Link>
        <Link
          href="/admin/images"
          className="text-gray-500 hover:text-gray-700 text-lg"
        >
          Image Manager
        </Link>
      </motion.div>
    </main>
  );
}
