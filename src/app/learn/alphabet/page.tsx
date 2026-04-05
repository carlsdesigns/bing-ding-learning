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
  getAlphabetWrongGuidance,
  shuffleArray,
} from '@/lib/game-messages';
import {
  type AlphabetGameMode,
  readAlphabetMode,
  writeAlphabetMode,
} from '@/lib/game-module-storage';

const getAttemptCount = () => useLearningStore.getState().attempts;

const BUTTON_COLORS = [
  'border-orange-400',
  'border-pink-400',
  'border-sky-400',
  'border-lime-400',
  'border-sunny-400',
  'border-grape-400',
  'border-coral-400',
];

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const PHONICS: Record<string, string> = {
  A: 'ah', B: 'buh', C: 'cuh', D: 'duh', E: 'eh',
  F: 'fuh', G: 'guh', H: 'huh', I: 'ih', J: 'juh',
  K: 'kuh', L: 'luh', M: 'muh', N: 'nuh', O: 'oh',
  P: 'puh', Q: 'kwuh', R: 'ruh', S: 'sss', T: 'tuh',
  U: 'uh', V: 'vuh', W: 'wuh', X: 'ks', Y: 'yuh', Z: 'zzz',
};

// These match the images generated from scripts/image-config.ts
const WORDS: Record<string, string> = {
  A: 'Apple', B: 'Bear', C: 'Cat', D: 'Dog', E: 'Elephant',
  F: 'Fish', G: 'Giraffe', H: 'Hat', I: 'Ice cream', J: 'Jellyfish',
  K: 'Kite', L: 'Lion', M: 'Moon', N: 'Nest', O: 'Owl',
  P: 'Penguin', Q: 'Queen', R: 'Rainbow', S: 'Sun', T: 'Tiger',
  U: 'Umbrella', V: 'Violin', W: 'Whale', X: 'Xylophone', Y: 'Yacht', Z: 'Zebra',
};

export default function AlphabetPage() {
  const [currentLetter, setCurrentLetter] = useState<string | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationLetter, setCelebrationLetter] = useState<string>('A');
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [mode, setModeInternal] = useState<AlphabetGameMode>('recognition');
  const [isIntroPhase, setIsIntroPhase] = useState(true);
  const [introImageIndex, setIntroImageIndex] = useState(0);
  const [buttonColorIndex, setButtonColorIndex] = useState(0);
  const [letterImages, setLetterImages] = useState<Record<string, string>>({});
  const [letterOrder, setLetterOrder] = useState<string[]>(() => shuffleArray(ALPHABET));
  const [orderIndex, setOrderIndex] = useState(0);

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

  const { 
    childName, 
    incrementInteraction, 
    shouldUseName, 
    markNameUsed,
    resetInteractionCount,
  } = useChildStore();

  const INTRO_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  
  const currentButtonColor = BUTTON_COLORS[buttonColorIndex % BUTTON_COLORS.length];

  const setMode = useCallback((m: AlphabetGameMode) => {
    setModeInternal(m);
    writeAlphabetMode(m);
  }, []);

  useEffect(() => {
    setModeInternal(readAlphabetMode());
  }, []);

  useEffect(() => {
    setModule('alphabet');
    setLearnerId('demo-learner');
    
    fetch('/api/images')
      .then(res => res.json())
      .then(data => {
        const imageMap: Record<string, string> = {};
        if (data.letters) {
          data.letters.forEach((item: { item: string; images: { path: string }[] }) => {
            if (item.images?.length > 0) {
              imageMap[item.item.toUpperCase()] = item.images[0].path;
            }
          });
        }
        setLetterImages(imageMap);
      })
      .catch(() => {});
  }, [setModule, setLearnerId]);

  useEffect(() => {
    if (isIntroPhase) {
      const interval = setInterval(() => {
        setIntroImageIndex((prev) => (prev + 1) % INTRO_LETTERS.length);
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isIntroPhase]);

  useEffect(() => {
    const runIntro = async () => {
      if (voiceEnabled) {
        const intro = getGameIntro('alphabet', childName || undefined);
        await speak(intro);
      }
      resetInteractionCount();
      setIsIntroPhase(false);
    };
    runIntro();
  }, []);

  const buildQuestionForTarget = useCallback(
    (target: string, speakPrompt: boolean) => {
      setCurrentLetter(target);
      setCurrentItem(target);
      resetAttempts();
      setButtonColorIndex((prev) => (prev + 1) % BUTTON_COLORS.length);

      const wrongOptions = ALPHABET.filter((l) => l !== target)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      const allOptions = [...wrongOptions, target].sort(() => Math.random() - 0.5);
      setOptions(allOptions);
      setFeedback(null);

      if (voiceEnabled && speakPrompt) {
        if (mode === 'recognition') {
          const useName = shouldUseName();
          const prompt = getQuestionPrompt('alphabet', target, childName || undefined, useName);
          if (useName) markNameUsed();
          speak(prompt);
        } else if (mode === 'phonics') {
          speak(`Which letter makes the ${PHONICS[target]} sound?`);
        } else {
          const word = WORDS[target];
          speak(`${target} is for ${word}. Find the letter ${target}.`);
        }
      }
    },
    [voiceEnabled, mode, shouldUseName, childName, markNameUsed, speak, setCurrentItem, resetAttempts]
  );

  const buildQuestionRef = useRef(buildQuestionForTarget);
  buildQuestionRef.current = buildQuestionForTarget;

  useEffect(() => {
    if (isIntroPhase) return;
    const q = shuffleArray(ALPHABET);
    setLetterOrder(q);
    setOrderIndex(0);
    buildQuestionRef.current(q[0], true);
  }, [isIntroPhase, mode]);

  const handleAnswer = async (selected: string) => {
    const correct = selected === currentLetter;
    incrementAttempts();
    incrementInteraction();
    setTotalAttempts((t) => t + 1);

    if (correct) {
      setCorrectCount((c) => c + 1);
      setCelebrationLetter(currentLetter!);
      setShowCelebration(true);
      
      const letterPhrase = `${currentLetter} is for ${WORDS[currentLetter!]}!`;
      const showEncouragement = (correctCount + 1) % 5 === 0;
      const useName = shouldUseName();
      const encouragement = showEncouragement ? ` ${getCorrectMessage(childName || undefined, useName)}` : '';
      if (useName && showEncouragement) markNameUsed();
      
      setFeedback(`${letterPhrase}${encouragement} 🎉`);

      try {
        await recordActivity({
          activityType: mode,
          target: currentLetter!,
          correct: true,
          attempts,
          voicePlayed: voiceEnabled,
        });
      } catch {
        // Session recording is optional
      }

      if (voiceEnabled) {
        await speak(`${letterPhrase}${encouragement}`);
      }

      setTimeout(() => {
        setShowCelebration(false);
      }, 2500);

      const nextIdx = (orderIndex + 1) % letterOrder.length;
      setOrderIndex(nextIdx);
      buildQuestionForTarget(letterOrder[nextIdx], true);
    } else {
      const wrongGuidance = getAlphabetWrongGuidance(
        currentLetter!,
        WORDS[currentLetter!],
        PHONICS[currentLetter!],
        childName || undefined,
        shouldUseName()
      );
      setFeedback(wrongGuidance);

      const t = currentLetter!;
      const wrongOpts = ALPHABET.filter((l) => l !== t)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      setOptions([...wrongOpts, t].sort(() => Math.random() - 0.5));

      if (voiceEnabled) {
        await speak(wrongGuidance);
      }

      if (getAttemptCount() >= 2 && hintsEnabled) {
        const hint = await getHint({
          moduleType: 'alphabet',
          currentItem: currentLetter!,
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

  const handleSpeakLetter = () => {
    if (!currentLetter) return;
    if (mode === 'pictures') {
      const word = WORDS[currentLetter];
      speak(`${currentLetter} is for ${word}. Find the letter ${currentLetter}.`);
      return;
    }
    speak(`${currentLetter}. ${PHONICS[currentLetter]}. ${currentLetter} is for ${WORDS[currentLetter]}`);
  };

  const progressPercent = totalAttempts > 0 ? (correctCount / totalAttempts) * 100 : 0;

  return (
    <main className="min-h-screen p-4 md:p-6 relative flex flex-col">
      <GameDecorativeShapes variant="alphabet" />
      <Celebration 
        show={showCelebration} 
        type="letter" 
        value={celebrationLetter} 
      />
      
      <div className="max-w-4xl mx-auto relative z-10 flex flex-col flex-1 w-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <KidBackButton />
          
          {/* Mode toggle */}
          <div className="flex flex-wrap justify-center max-w-[min(100%,22rem)] sm:max-w-none bg-white/80 backdrop-blur-sm rounded-full p-1 shadow-md gap-0.5">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setMode('recognition')}
              className={`px-3 py-2 sm:px-4 rounded-full font-bold text-xs sm:text-sm transition-all ${
                mode === 'recognition' 
                  ? 'bg-orange-400 text-white shadow-md' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Letters
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setMode('phonics')}
              className={`px-3 py-2 sm:px-4 rounded-full font-bold text-xs sm:text-sm transition-all ${
                mode === 'phonics' 
                  ? 'bg-orange-400 text-white shadow-md' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Sounds
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setMode('pictures')}
              className={`px-3 py-2 sm:px-4 rounded-full font-bold text-xs sm:text-sm transition-all ${
                mode === 'pictures' 
                  ? 'bg-orange-400 text-white shadow-md' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Pictures
            </motion.button>
          </div>
          
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
              className="h-full bg-gradient-to-r from-orange-400 to-pink-400 rounded-full"
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
                      key={introImageIndex}
                      initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                      animate={{ scale: 1, opacity: 1, rotate: 0 }}
                      exit={{ scale: 0.5, opacity: 0, rotate: 10 }}
                      transition={{ duration: 0.25 }}
                      className="relative w-48 h-48 md:w-64 md:h-64"
                    >
                      {letterImages[INTRO_LETTERS[introImageIndex]] ? (
                        <Image
                          src={letterImages[INTRO_LETTERS[introImageIndex]]}
                          alt={INTRO_LETTERS[introImageIndex]}
                          fill
                          className="object-contain"
                        />
                      ) : (
                        <div 
                          className="w-full h-full flex items-center justify-center text-[8rem] md:text-[10rem] font-black text-orange-400 leading-none"
                          style={{ textShadow: '4px 4px 0 rgba(0,0,0,0.1)' }}
                        >
                          {INTRO_LETTERS[introImageIndex]}
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-700 mb-4">
                  {mode === 'recognition' && 'Find the Letter!'}
                  {mode === 'phonics' && `Which letter says "${PHONICS[currentLetter || 'A']}"?`}
                  {mode === 'pictures' && 'What letter goes with this picture?'}
                </h2>
                
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentLetter}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className={`text-center ${showCelebration ? 'animate-celebrate' : ''}`}
                  >
                    {mode === 'recognition' && (
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleSpeakLetter}
                        className="inline-block text-[8rem] md:text-[10rem] font-black text-orange-400 mb-4 cursor-pointer leading-none"
                        style={{ textShadow: '4px 4px 0 rgba(0,0,0,0.1)' }}
                      >
                        {currentLetter}
                      </motion.div>
                    )}
                    {mode === 'phonics' && (
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => speak(`${PHONICS[currentLetter || 'A']}`)}
                        className="inline-flex items-center gap-4 text-5xl md:text-6xl font-bold text-pink-400 mb-4 cursor-pointer bg-pink-50 px-6 py-3 rounded-3xl"
                      >
                        <span className="text-4xl">🔊</span>
                        <span>"{PHONICS[currentLetter || 'A']}"</span>
                      </motion.div>
                    )}
                    {mode === 'pictures' && currentLetter && (
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSpeakLetter}
                        className="relative w-52 h-52 sm:w-64 sm:h-64 md:w-72 md:h-72 mx-auto mb-4 cursor-pointer"
                      >
                        {letterImages[currentLetter] ? (
                          <Image
                            src={letterImages[currentLetter]}
                            alt={`${WORDS[currentLetter]} for letter ${currentLetter}`}
                            fill
                            className="object-contain drop-shadow-md"
                            sizes="(max-width: 768px) 208px, 288px"
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center text-[6rem] sm:text-[8rem] font-black text-orange-400"
                            style={{ textShadow: '4px 4px 0 rgba(0,0,0,0.1)' }}
                          >
                            {currentLetter}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                </AnimatePresence>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 justify-items-center">
                  {options.map((letter) => (
                    <motion.button
                      key={letter}
                      whileHover={{ scale: 1.08, y: -4 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleAnswer(letter)}
                      disabled={isPlaying}
                      className={`w-20 h-20 md:w-24 md:h-24 bg-white border-4 ${currentButtonColor} rounded-3xl text-3xl md:text-4xl font-bold text-gray-700 shadow-lg hover:shadow-xl disabled:opacity-50 transition-all`}
                    >
                      {letter}
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
                  const nextIdx = (orderIndex + 1) % letterOrder.length;
                  setOrderIndex(nextIdx);
                  buildQuestionForTarget(letterOrder[nextIdx], true);
                }}
                className="px-6 py-2 md:px-8 md:py-3 bg-white rounded-full shadow-lg text-gray-600 font-bold text-base md:text-lg hover:bg-gray-50 transition-colors"
              >
                Skip
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSpeakLetter}
                disabled={isPlaying}
                className="px-6 py-2 md:px-8 md:py-3 bg-pink-400 rounded-full shadow-lg text-white font-bold text-base md:text-lg hover:bg-pink-500 disabled:opacity-50 transition-colors flex items-center gap-2"
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
