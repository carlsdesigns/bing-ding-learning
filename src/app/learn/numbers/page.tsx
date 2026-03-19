'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { TouchButton } from '@/components/touch/touch-button';
import { Celebration } from '@/components/celebration';
import { GameDecorativeShapes } from '@/components/ui/decorative-shapes';
import { useVoice, useAI, useSession } from '@/hooks';
import { useLearningStore, useChildStore } from '@/stores';
import { getGameIntro, getCorrectMessage, getQuestionPrompt } from '@/lib/game-messages';

const NUMBERS = Array.from({ length: 10 }, (_, i) => i);

const BUTTON_COLORS = [
  'border-lime-400',
  'border-sunny-400',
  'border-orange-400',
  'border-sky-400',
  'border-pink-400',
  'border-grape-400',
  'border-coral-400',
];

export default function NumbersPage() {
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [options, setOptions] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationNumber, setCelebrationNumber] = useState<string>('1');
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [isIntroPhase, setIsIntroPhase] = useState(true);
  const [introNumberIndex, setIntroNumberIndex] = useState(0);
  const [buttonColorIndex, setButtonColorIndex] = useState(0);
  const [introImages, setIntroImages] = useState<Record<string, string>>({});

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

  const { 
    childName, 
    incrementInteraction, 
    shouldUseName, 
    markNameUsed,
    resetInteractionCount,
  } = useChildStore();

  const INTRO_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
  
  const currentButtonColor = BUTTON_COLORS[buttonColorIndex % BUTTON_COLORS.length];

  useEffect(() => {
    setModule('numbers');
    setLearnerId('demo-learner');
    
    // Fetch images for intro
    fetch('/api/images')
      .then(res => res.json())
      .then(data => {
        const imageMap: Record<string, string> = {};
        if (data.numbers) {
          data.numbers.forEach((item: { item: string; images: { path: string }[] }) => {
            if (item.images?.length > 0) {
              imageMap[item.item] = item.images[0].path;
            }
          });
        }
        setIntroImages(imageMap);
      })
      .catch(() => {});
  }, [setModule, setLearnerId]);

  useEffect(() => {
    if (isIntroPhase) {
      const interval = setInterval(() => {
        setIntroNumberIndex((prev) => (prev + 1) % INTRO_NUMBERS.length);
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isIntroPhase]);

  useEffect(() => {
    const runIntro = async () => {
      if (voiceEnabled) {
        const intro = getGameIntro('numbers', childName || undefined);
        await speak(intro);
      }
      resetInteractionCount();
      setIsIntroPhase(false);
    };
    runIntro();
  }, []);

  useEffect(() => {
    if (!isIntroPhase && currentNumber === null) {
      generateNewQuestion(true);
    }
  }, [isIntroPhase]);

  const generateNewQuestion = useCallback((speakPrompt = true) => {
    const target = NUMBERS[Math.floor(Math.random() * NUMBERS.length)];
    setCurrentNumber(target);
    setCurrentItem(target.toString());
    resetAttempts();
    setButtonColorIndex((prev) => (prev + 1) % BUTTON_COLORS.length);

    const wrongOptions = NUMBERS.filter((n) => n !== target)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const allOptions = [...wrongOptions, target].sort(() => Math.random() - 0.5);
    setOptions(allOptions);
    setFeedback(null);

    if (voiceEnabled && speakPrompt) {
      const useName = shouldUseName();
      const prompt = getQuestionPrompt('numbers', target.toString(), childName || undefined, useName);
      if (useName) markNameUsed();
      speak(prompt);
    }
  }, [voiceEnabled, shouldUseName, childName, markNameUsed, speak, setCurrentItem, resetAttempts]);

  const handleAnswer = async (selected: number) => {
    const correct = selected === currentNumber;
    incrementAttempts();
    incrementInteraction();
    setTotalAttempts((t) => t + 1);

    if (correct) {
      setCorrectCount((c) => c + 1);
      setCelebrationNumber(currentNumber!.toString());
      setShowCelebration(true);
      
      const numberPhrase = `That's ${currentNumber}!`;
      const showEncouragement = (correctCount + 1) % 5 === 0;
      const useName = shouldUseName();
      const encouragement = showEncouragement ? ` ${getCorrectMessage(childName || undefined, useName)}` : '';
      if (useName && showEncouragement) markNameUsed();
      
      setFeedback(`${numberPhrase}${encouragement} 🎉`);

      try {
        await recordActivity({
          activityType: 'recognition',
          target: currentNumber!.toString(),
          correct: true,
          attempts,
          voicePlayed: voiceEnabled,
        });
      } catch {
        // Session recording is optional
      }

      if (voiceEnabled) {
        await speak(`${numberPhrase}${encouragement}`);
      }

      setTimeout(() => {
        setShowCelebration(false);
      }, 2000);

      generateNewQuestion(true);
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
    <main className="min-h-screen p-4 md:p-6 relative flex flex-col">
      <GameDecorativeShapes variant="numbers" />
      <Celebration 
        show={showCelebration} 
        type="number" 
        value={celebrationNumber} 
      />
      
      <div className="max-w-4xl mx-auto relative z-10 flex flex-col flex-1 w-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <Link href="/">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-md text-gray-600 font-medium hover:bg-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </motion.button>
          </Link>
          
          <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-5 py-2 rounded-full shadow-md">
            <span className="text-2xl">⭐</span>
            <span className="text-xl font-bold text-gray-700">
              {correctCount}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner">
            <motion.div 
              className="h-full bg-gradient-to-r from-lime-400 to-lime-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Main game card - centered vertically */}
        <div className="flex-1 flex flex-col justify-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-4xl shadow-xl p-6 md:p-8"
          >
            {isIntroPhase ? (
              <>
                <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-700 mb-6">
                  Get Ready!
                </h2>
                <div className="flex justify-center items-center min-h-[250px] mb-6">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={introNumberIndex}
                      initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                      animate={{ scale: 1, opacity: 1, rotate: 0 }}
                      exit={{ scale: 0.5, opacity: 0, rotate: 10 }}
                      transition={{ duration: 0.25 }}
                      className="relative w-48 h-48 md:w-64 md:h-64"
                    >
                      {introImages[INTRO_NUMBERS[introNumberIndex].toString()] ? (
                        <Image
                          src={introImages[INTRO_NUMBERS[introNumberIndex].toString()]}
                          alt={INTRO_NUMBERS[introNumberIndex].toString()}
                          fill
                          className="object-contain"
                        />
                      ) : (
                        <div 
                          className="w-full h-full flex items-center justify-center text-[8rem] md:text-[10rem] font-black text-lime-500 leading-none"
                          style={{ textShadow: '4px 4px 0 rgba(0,0,0,0.1)' }}
                        >
                          {INTRO_NUMBERS[introNumberIndex]}
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-700 mb-4">
                  Find the Number!
                </h2>
                
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentNumber}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className={`text-center ${showCelebration ? 'animate-celebrate' : ''}`}
                  >
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSpeakNumber}
                      className="inline-block text-[8rem] md:text-[10rem] font-black text-lime-500 mb-4 cursor-pointer leading-none"
                      style={{ textShadow: '4px 4px 0 rgba(0,0,0,0.1)' }}
                    >
                      {currentNumber}
                    </motion.div>
                  </motion.div>
                </AnimatePresence>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 justify-items-center">
                  {options.map((num) => (
                    <motion.button
                      key={num}
                      whileHover={{ scale: 1.08, y: -4 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleAnswer(num)}
                      disabled={isPlaying}
                      className={`w-20 h-20 md:w-24 md:h-24 bg-white border-4 ${currentButtonColor} rounded-3xl text-3xl md:text-4xl font-bold text-gray-700 shadow-lg hover:shadow-xl disabled:opacity-50 transition-all`}
                    >
                      {num}
                    </motion.button>
                  ))}
                </div>

                {feedback && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 text-center text-xl md:text-2xl font-bold text-gray-700"
                  >
                    {feedback}
                  </motion.div>
                )}
              </>
            )}
          </motion.div>

          {/* Action buttons */}
          {!isIntroPhase && (
            <div className="flex justify-center gap-4 mt-4">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => generateNewQuestion()}
                className="px-6 py-2 md:px-8 md:py-3 bg-white rounded-full shadow-lg text-gray-600 font-bold text-base md:text-lg hover:bg-gray-50 transition-colors"
              >
                Skip
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSpeakNumber}
                disabled={isPlaying}
                className="px-6 py-2 md:px-8 md:py-3 bg-sunny-400 rounded-full shadow-lg text-white font-bold text-base md:text-lg hover:bg-sunny-500 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                <span className="text-lg md:text-xl">🔊</span> Hear It
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
