'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KidBackButton } from '@/components/ui/kid-back-button';
import Image from 'next/image';
import { Celebration } from '@/components/celebration';
import { GameDecorativeShapes } from '@/components/ui/decorative-shapes';
import { useVoice, useAI, useSession } from '@/hooks';
import { useLearningStore, useChildStore } from '@/stores';
import {
  getGameIntro,
  getCorrectMessage,
  getQuestionPrompt,
  getNumbersWrongGuidance,
  shuffleArray,
} from '@/lib/game-messages';
import {
  type NumbersGameMode,
  readNumbersMode,
  writeNumbersMode,
} from '@/lib/game-module-storage';
import { NUMBER_CONFIG } from '@/../scripts/image-config';

const getAttemptCount = () => useLearningStore.getState().attempts;

const NUMBERS = Array.from({ length: 10 }, (_, i) => i);

function numberPicturesSpeech(target: number): string {
  const key = target.toString();
  const desc = NUMBER_CONFIG[key]?.description ?? `the number ${target}`;
  return `${desc}. Find the number ${target}.`;
}

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
  const [mode, setModeInternal] = useState<NumbersGameMode>('numeral');
  const [isIntroPhase, setIsIntroPhase] = useState(true);
  const [introNumberIndex, setIntroNumberIndex] = useState(0);
  const [buttonColorIndex, setButtonColorIndex] = useState(0);
  const [numberImages, setNumberImages] = useState<Record<string, string>>({});
  const [numberOrder, setNumberOrder] = useState<number[]>(() => shuffleArray(NUMBERS));
  const [orderIndex, setOrderIndex] = useState(0);
  const [choiceButtonsLocked, setChoiceButtonsLocked] = useState(false);
  const choiceAdvanceGuardRef = useRef(false);

  const { speak } = useVoice();
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

  const setMode = useCallback((m: NumbersGameMode) => {
    setModeInternal(m);
    writeNumbersMode(m);
  }, []);

  useEffect(() => {
    setModeInternal(readNumbersMode());
  }, []);

  useEffect(() => {
    setModule('numbers');
    setLearnerId('demo-learner');
    
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
        setNumberImages(imageMap);
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

  const buildQuestionForTarget = useCallback(
    async (target: number, speakPrompt: boolean) => {
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
        if (mode === 'numeral') {
          const useName = shouldUseName();
          const prompt = getQuestionPrompt('numbers', target.toString(), childName || undefined, useName);
          if (useName) markNameUsed();
          await speak(prompt);
        } else {
          await speak(numberPicturesSpeech(target));
        }
      } else if (speakPrompt) {
        await new Promise((r) => setTimeout(r, 420));
      }
    },
    [voiceEnabled, mode, shouldUseName, childName, markNameUsed, speak, setCurrentItem, resetAttempts]
  );

  const buildQuestionRef = useRef(buildQuestionForTarget);
  buildQuestionRef.current = buildQuestionForTarget;

  useEffect(() => {
    if (isIntroPhase) return;
    const q = shuffleArray(NUMBERS);
    setNumberOrder(q);
    setOrderIndex(0);
    buildQuestionRef.current(q[0], true);
  }, [isIntroPhase, mode]);

  const handleAnswer = async (selected: number) => {
    if (choiceAdvanceGuardRef.current) return;
    const correct = selected === currentNumber;
    if (correct) {
      choiceAdvanceGuardRef.current = true;
      setChoiceButtonsLocked(true);
    }

    incrementAttempts();
    incrementInteraction();
    setTotalAttempts((t) => t + 1);

    if (correct) {
      try {
        setCorrectCount((c) => c + 1);
        setCelebrationNumber(currentNumber!.toString());
        setShowCelebration(true);

        const numberPhrase = `That's ${currentNumber}!`;
        const showEncouragement = (correctCount + 1) % 5 === 0;
        const useName = shouldUseName();
        const encouragement = showEncouragement
          ? ` ${getCorrectMessage(childName || undefined, useName)}`
          : '';
        if (useName && showEncouragement) markNameUsed();

        setFeedback(`${numberPhrase}${encouragement} 🎉`);

        try {
          await recordActivity({
            activityType: mode,
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

        const nextIdx = (orderIndex + 1) % numberOrder.length;
        setOrderIndex(nextIdx);
        await buildQuestionForTarget(numberOrder[nextIdx], true);
      } finally {
        choiceAdvanceGuardRef.current = false;
        setChoiceButtonsLocked(false);
      }
    } else {
      const wrongGuidance = getNumbersWrongGuidance(
        currentNumber!.toString(),
        childName || undefined,
        shouldUseName()
      );
      setFeedback(wrongGuidance);

      if (voiceEnabled) {
        await speak(wrongGuidance);
      }

      if (getAttemptCount() >= 2 && hintsEnabled) {
        const hint = await getHint({
          moduleType: 'numbers',
          currentItem: currentNumber!.toString(),
          attempts: getAttemptCount(),
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
    if (currentNumber === null) return;
    if (mode === 'pictures') {
      speak(numberPicturesSpeech(currentNumber));
      return;
    }
    speak(`This is the number ${currentNumber}`);
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
        <div className="flex justify-between items-center mb-4 gap-2">
          <KidBackButton />
          
          <div className="flex flex-wrap justify-center max-w-[min(100%,18rem)] sm:max-w-none bg-white/80 backdrop-blur-sm rounded-full p-1 shadow-md gap-0.5">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setMode('numeral')}
              className={`px-3 py-2 sm:px-4 rounded-full font-bold text-xs sm:text-sm transition-all ${
                mode === 'numeral'
                  ? 'bg-lime-400 text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Numbers
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setMode('pictures')}
              className={`px-3 py-2 sm:px-4 rounded-full font-bold text-xs sm:text-sm transition-all ${
                mode === 'pictures'
                  ? 'bg-lime-400 text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Pictures
            </motion.button>
          </div>
          
          <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-5 py-2 rounded-full shadow-md shrink-0">
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
                      {numberImages[INTRO_NUMBERS[introNumberIndex].toString()] ? (
                        <Image
                          src={numberImages[INTRO_NUMBERS[introNumberIndex].toString()]}
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
                  {mode === 'numeral' && 'Find the Number!'}
                  {mode === 'pictures' && 'What number goes with this picture?'}
                </h2>
                
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${currentNumber}-${mode}`}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className={`text-center ${showCelebration ? 'animate-celebrate' : ''}`}
                  >
                    {mode === 'numeral' && currentNumber !== null && (
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleSpeakNumber}
                        className="inline-block text-[8rem] md:text-[10rem] font-black text-lime-500 mb-4 cursor-pointer leading-none"
                        style={{ textShadow: '4px 4px 0 rgba(0,0,0,0.1)' }}
                      >
                        {currentNumber}
                      </motion.div>
                    )}
                    {mode === 'pictures' && currentNumber !== null && (
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSpeakNumber}
                        className="relative w-52 h-52 sm:w-64 sm:h-64 md:w-72 md:h-72 mx-auto mb-4 cursor-pointer"
                      >
                        {numberImages[currentNumber.toString()] ? (
                          <Image
                            src={numberImages[currentNumber.toString()]}
                            alt={`${NUMBER_CONFIG[currentNumber.toString()]?.description ?? currentNumber}`}
                            fill
                            className="object-contain drop-shadow-md"
                            sizes="(max-width: 768px) 208px, 288px"
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center text-[6rem] sm:text-[8rem] font-black text-lime-500"
                            style={{ textShadow: '4px 4px 0 rgba(0,0,0,0.1)' }}
                          >
                            {currentNumber}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                </AnimatePresence>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 justify-items-center">
                  {options.map((num) => (
                    <motion.button
                      key={num}
                      whileHover={{ scale: 1.08, y: -4 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleAnswer(num)}
                      disabled={choiceButtonsLocked}
                      className={`w-20 h-20 md:w-24 md:h-24 bg-white border-4 ${currentButtonColor} rounded-3xl text-3xl md:text-4xl font-bold text-gray-700 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:pointer-events-none`}
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
                onClick={() => {
                  const nextIdx = (orderIndex + 1) % numberOrder.length;
                  setOrderIndex(nextIdx);
                  buildQuestionForTarget(numberOrder[nextIdx], true);
                }}
                className="px-6 py-2 md:px-8 md:py-3 bg-white rounded-full shadow-lg text-gray-600 font-bold text-base md:text-lg hover:bg-gray-50 transition-colors"
              >
                Skip
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSpeakNumber}
                className="px-6 py-2 md:px-8 md:py-3 bg-sunny-400 rounded-full shadow-lg text-white font-bold text-base md:text-lg hover:bg-sunny-500 transition-colors flex items-center gap-2"
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
