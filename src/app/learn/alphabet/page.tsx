'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { TouchButton } from '@/components/touch/touch-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useVoice, useAI, useSession } from '@/hooks';
import { useLearningStore } from '@/stores';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const PHONICS: Record<string, string> = {
  A: 'ah', B: 'buh', C: 'cuh', D: 'duh', E: 'eh',
  F: 'fuh', G: 'guh', H: 'huh', I: 'ih', J: 'juh',
  K: 'kuh', L: 'luh', M: 'muh', N: 'nuh', O: 'oh',
  P: 'puh', Q: 'kwuh', R: 'ruh', S: 'sss', T: 'tuh',
  U: 'uh', V: 'vuh', W: 'wuh', X: 'ks', Y: 'yuh', Z: 'zzz',
};

const WORDS: Record<string, string> = {
  A: 'Apple', B: 'Ball', C: 'Cat', D: 'Dog', E: 'Elephant',
  F: 'Fish', G: 'Grape', H: 'Hat', I: 'Ice cream', J: 'Jelly',
  K: 'Kite', L: 'Lion', M: 'Moon', N: 'Nest', O: 'Orange',
  P: 'Penguin', Q: 'Queen', R: 'Rainbow', S: 'Sun', T: 'Tiger',
  U: 'Umbrella', V: 'Violin', W: 'Whale', X: 'Xylophone', Y: 'Yo-yo', Z: 'Zebra',
};

export default function AlphabetPage() {
  const [currentLetter, setCurrentLetter] = useState<string | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [mode, setMode] = useState<'recognition' | 'phonics'>('recognition');

  const { speak, isPlaying } = useVoice();
  const { getHint, getEncouragement } = useAI();
  const { recordActivity } = useSession();
  const {
    voiceEnabled,
    hintsEnabled,
    difficulty,
    attempts,
    incrementAttempts,
    resetAttempts,
    setCurrentItem,
    setModule,
    setLearnerId,
  } = useLearningStore();

  useEffect(() => {
    setModule('alphabet');
    setLearnerId('demo-learner');
    generateNewQuestion();
  }, [mode]);

  const generateNewQuestion = () => {
    const target = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    setCurrentLetter(target);
    setCurrentItem(target);
    resetAttempts();

    const wrongOptions = ALPHABET.filter((l) => l !== target)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const allOptions = [...wrongOptions, target].sort(() => Math.random() - 0.5);
    setOptions(allOptions);
    setFeedback(null);

    if (voiceEnabled) {
      if (mode === 'recognition') {
        speak(`Find the letter ${target}`);
      } else {
        speak(`Which letter makes the ${PHONICS[target]} sound?`);
      }
    }
  };

  const handleAnswer = async (selected: string) => {
    const correct = selected === currentLetter;
    incrementAttempts();
    setTotalAttempts((t) => t + 1);

    if (correct) {
      setCorrectCount((c) => c + 1);
      setShowCelebration(true);
      setFeedback(`Yes! ${currentLetter} is for ${WORDS[currentLetter!]}! 🎉`);

      if (voiceEnabled) {
        speak(`${currentLetter} is for ${WORDS[currentLetter!]}!`);
      }

      await recordActivity({
        activityType: mode,
        target: currentLetter!,
        correct: true,
        attempts,
        voicePlayed: voiceEnabled,
      });

      setTimeout(() => {
        setShowCelebration(false);
        generateNewQuestion();
      }, 2500);
    } else {
      setFeedback('Try again! 💪');

      if (voiceEnabled) {
        speak('Oops! Try again!');
      }

      if (attempts >= 2 && hintsEnabled) {
        const hint = await getHint({
          moduleType: 'alphabet',
          currentItem: currentLetter!,
          attempts,
          difficulty,
        });
        setFeedback(hint);
        if (voiceEnabled) {
          speak(hint);
        }
      }
    }
  };

  const handleSpeakLetter = () => {
    if (currentLetter) {
      speak(`${currentLetter}. ${PHONICS[currentLetter]}. ${currentLetter} is for ${WORDS[currentLetter]}`);
    }
  };

  const progressPercent = totalAttempts > 0 ? (correctCount / totalAttempts) * 100 : 0;

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm">
              ← Back
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            <Button
              variant={mode === 'recognition' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('recognition')}
            >
              Letters
            </Button>
            <Button
              variant={mode === 'phonics' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('phonics')}
            >
              Sounds
            </Button>
          </div>
          <span className="text-lg font-medium">
            Score: {correctCount}/{totalAttempts}
          </span>
        </div>

        <Progress value={progressPercent} className="mb-8 h-4" />

        <Card className="mb-8">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {mode === 'recognition'
                ? 'Find the Letter!'
                : `Which letter says "${PHONICS[currentLetter || 'A']}"?`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentLetter}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className={`text-center ${showCelebration ? 'animate-celebrate' : ''}`}
              >
                {mode === 'recognition' && (
                  <div
                    className="text-9xl font-bold text-secondary-600 mb-8 cursor-pointer hover:text-secondary-700"
                    onClick={handleSpeakLetter}
                  >
                    {currentLetter}
                  </div>
                )}
                {mode === 'phonics' && (
                  <div
                    className="text-6xl font-bold text-secondary-600 mb-8 cursor-pointer hover:text-secondary-700"
                    onClick={() => speak(`${PHONICS[currentLetter || 'A']}`)}
                  >
                    🔊 "{PHONICS[currentLetter || 'A']}"
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 justify-items-center">
              {options.map((letter) => (
                <TouchButton
                  key={letter}
                  onClick={() => handleAnswer(letter)}
                  variant="outline"
                  size="lg"
                  disabled={isPlaying}
                >
                  {letter}
                </TouchButton>
              ))}
            </div>

            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 text-center text-2xl font-medium text-gray-700"
              >
                {feedback}
              </motion.div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-center gap-4">
          <Button onClick={generateNewQuestion} variant="secondary">
            Skip
          </Button>
          <Button
            onClick={handleSpeakLetter}
            variant="accent"
            disabled={isPlaying}
          >
            🔊 Hear It
          </Button>
        </div>
      </div>
    </main>
  );
}
