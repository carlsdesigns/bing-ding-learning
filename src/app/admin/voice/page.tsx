'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface CacheStatus {
  cacheDir: string;
  cachedCount: number;
  cachedFiles: string[];
}

interface WarmResult {
  total: number;
  cached: number;
  generated: number;
  errors: number;
  results: { phrase: string; status: string; error?: string }[];
}

export default function VoiceAdminPage() {
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null);
  const [isWarming, setIsWarming] = useState(false);
  const [warmResult, setWarmResult] = useState<WarmResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchCacheStatus = async () => {
    try {
      const response = await fetch('/api/voice/warm-cache');
      if (response.ok) {
        const data = await response.json();
        setCacheStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch cache status:', err);
    }
  };

  useEffect(() => {
    fetchCacheStatus();
  }, []);

  const handleWarmCache = async () => {
    setIsWarming(true);
    setError(null);
    setWarmResult(null);

    try {
      const response = await fetch('/api/voice/warm-cache', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to warm cache');
      }

      const result = await response.json();
      setWarmResult(result);
      fetchCacheStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsWarming(false);
    }
  };

  const handleTestVoice = async (phrase: string) => {
    try {
      const response = await fetch('/api/voice/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: phrase }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      const cacheHit = response.headers.get('X-TTS-Cache') === 'hit';
      console.log(`Playing: "${phrase}" (cache ${cacheHit ? 'hit' : 'miss'})`);
      
      audio.onended = () => URL.revokeObjectURL(audioUrl);
      await audio.play();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to play audio');
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Voice & TTS Settings</h1>
          <Link href="/">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium text-gray-700"
            >
              Back to Home
            </motion.button>
          </Link>
        </div>

        {/* Cache Status */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">TTS Cache Status</h2>
          
          {cacheStatus ? (
            <div className="space-y-2">
              <p className="text-gray-600">
                <span className="font-medium">Cached phrases:</span>{' '}
                <span className="text-2xl font-bold text-lime-600">{cacheStatus.cachedCount}</span>
              </p>
              <p className="text-sm text-gray-500">
                Cache location: <code className="bg-gray-100 px-2 py-1 rounded">{cacheStatus.cacheDir}</code>
              </p>
            </div>
          ) : (
            <p className="text-gray-500">Loading cache status...</p>
          )}
        </div>

        {/* Warm Cache Button */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Pre-generate Audio Cache</h2>
          <p className="text-gray-600 mb-4">
            Generate and cache all letter and number phrases to avoid ElevenLabs API calls during gameplay.
            This will generate 26 letter phrases + 10 number phrases.
          </p>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleWarmCache}
            disabled={isWarming}
            className={`px-6 py-3 rounded-xl font-bold text-white shadow-md ${
              isWarming 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-lime-500 hover:bg-lime-600'
            }`}
          >
            {isWarming ? 'Generating... (this may take a minute)' : 'Warm Cache'}
          </motion.button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {warmResult && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="font-medium text-green-800 mb-2">Cache warming complete!</p>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-600">{warmResult.cached}</p>
                  <p className="text-gray-500">Already cached</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-lime-600">{warmResult.generated}</p>
                  <p className="text-gray-500">Newly generated</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{warmResult.errors}</p>
                  <p className="text-gray-500">Errors</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Test Voices */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Test Voice</h2>
          <p className="text-gray-600 mb-4">
            Click a button to test the TTS. Check the console to see if it was a cache hit or miss.
          </p>
          
          <div className="flex flex-wrap gap-2">
            {['A is for Apple!', 'B is for Bear!', 'C is for Cat!', '1 is for One balloon!'].map((phrase) => (
              <motion.button
                key={phrase}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleTestVoice(phrase)}
                className="px-4 py-2 bg-sky-100 hover:bg-sky-200 rounded-lg text-sky-700 font-medium text-sm"
              >
                {phrase}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Link to Image Admin */}
        <div className="mt-6 text-center">
          <Link href="/admin/images" className="text-gray-500 hover:text-gray-700 underline">
            Go to Image Manager
          </Link>
        </div>
      </div>
    </main>
  );
}
