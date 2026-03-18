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

const NUMBERS = Array.from({ length: 10 }, (_, i) => i);

export default function NumbersPage() {
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [options, setOptions] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);

  const { speak, isPlaying } = useVoice();
  const { getHint, getEncouragement } = useAI();
  const { startSession, recordActivity, isActive } = useSession();
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
    setModule('numbers');
    setLearnerId('demo-learner');
    generateNewQuestion();
  }, []);

  const generateNewQuestion = () => {
    const target = NUMBERS[Math.floor(Math.random() * NUMBERS.length)];
    setCurrentNumber(target);
    setCurrentItem(target.toString());
    resetAttempts();

    const wrongOptions = NUMBERS.filter((n) => n !== target)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const allOptions = [...wrongOptions, target].sort(() => Math.random() - 0.5);
    setOptions(allOptions);
    setFeedback(null);

    if (voiceEnabled) {
      speak(`Find the number ${target}`);
    }
  };

  const handleAnswer = async (selected: number) => {
    const correct = selected === currentNumber;
    incrementAttempts();
    setTotalAttempts((t) => t + 1);

    if (correct) {
      setCorrectCount((c) => c + 1);
      setShowCelebration(true);
      setFeedback('Great job! 🎉');

      if (voiceEnabled) {
        const message = await getEncouragement(true);
        speak(message);
      }

      await recordActivity({
        activityType: 'recognition',
        target: currentNumber!.toString(),
        correct: true,
        attempts,
        voicePlayed: voiceEnabled,
      });

      setTimeout(() => {
        setShowCelebration(false);
        generateNewQuestion();
      }, 2000);
    } else {
      setFeedback('Try again! 💪');

      if (voiceEnabled) {
        speak('Oops! Try again!');
      }

      if (attempts >= 2 && hintsEnabled) {
        const hint = await getHint({
          moduleType: 'numbers',
          currentItem: currentNumber!.toString(),
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

  const handleSpeakNumber = () => {
    if (currentNumber !== null) {
      speak(`This is the number ${currentNumber}`);
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
            <span className="text-lg font-medium">
              Score: {correctCount}/{totalAttempts}
            </span>
          </div>
        </div>

        <Progress value={progressPercent} className="mb-8 h-4" />

        <Card className="mb-8">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Find the Number!</CardTitle>
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentNumber}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className={`text-center ${showCelebration ? 'animate-celebrate' : ''}`}
              >
                <div
                  className="text-9xl font-bold text-primary-600 mb-8 cursor-pointer hover:text-primary-700"
                  onClick={handleSpeakNumber}
                >
                  {currentNumber}
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 justify-items-center">
              {options.map((num) => (
                <TouchButton
                  key={num}
                  onClick={() => handleAnswer(num)}
                  variant="outline"
                  size="lg"
                  disabled={isPlaying}
                >
                  {num}
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
            onClick={handleSpeakNumber}
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
