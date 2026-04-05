'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { usePlaygroundStore } from '@/stores/playground-store';

/** Preset worlds only — blank removed; voice-create is the first grid tile. */
const PRE_CREATED_WORLDS = [
  { id: 'undersea', name: 'Under the Sea', thumbnail: '/images/backgrounds/world_undersea.jpg' },
  { id: 'land', name: 'The Land', thumbnail: '/images/backgrounds/world_land.jpg' },
  { id: 'schoolyard', name: 'Schoolyard', thumbnail: '/images/backgrounds/world_schoolyard.jpg' },
  { id: 'clouds', name: 'In the Clouds', thumbnail: '/images/backgrounds/world_clouds.jpg' },
  { id: 'stars', name: 'In the Stars', thumbnail: '/images/backgrounds/world_stars.jpg' },
  { id: 'frozen', name: 'Frozen World', thumbnail: '/images/backgrounds/world_frozen.jpg' },
  { id: 'desert', name: 'Desert', thumbnail: '/images/backgrounds/world_desert.jpg' },
] as const;

const YOUR_WORLDS_PAGE = 8;

/** Newest-first: long numeric timestamps in URL/filename sort as larger = newer. */
function sortBackgroundsNewestFirst(urls: string[]): string[] {
  const score = (u: string) => {
    const nums = u.match(/\d{10,}/g);
    if (!nums?.length) return 0;
    return Math.max(...nums.map((n) => parseInt(n, 10)));
  };
  return [...urls].sort((a, b) => score(b) - score(a));
}

type Tab = 'browse' | 'create';

interface WorldPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** When the modal opens, show this tab (toolbar mic uses `create` for quick access). */
  initialTab?: Tab;
}

/** Stacking above playground keyboard (z-300) and toolbars — portaled to body. */
const Z_BACKDROP = 'z-[6000]';
const Z_MODAL = 'z-[6001]';

export function WorldPickerModal({
  isOpen,
  onClose,
  initialTab: initialTabProp = 'browse',
}: WorldPickerModalProps) {
  const { currentBackground, setBackground, availableBackgrounds, loadBackgrounds, registerUserBackground } =
    usePlaygroundStore();
  const [activeTab, setActiveTab] = useState<Tab>('browse');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [portalReady, setPortalReady] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const pendingPromptRef = useRef<string>('');
  const shouldAutoSubmitRef = useRef(false);
  const generationInFlightRef = useRef(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    loadBackgrounds();
    setActiveTab(initialTabProp);
    if (initialTabProp === 'create') {
      setCustomPrompt('');
      shouldAutoSubmitRef.current = false;
      recognitionRef.current?.stop();
      setIsListening(false);
    }
  }, [isOpen, loadBackgrounds, initialTabProp]);

  const handleSelectWorld = useCallback(
    (thumbnail: string) => {
      setBackground(thumbnail);
      onClose();
    },
    [setBackground, onClose]
  );

  const triggerGeneration = useCallback(async (prompt: string) => {
    if (!prompt.trim() || generationInFlightRef.current) return;
    generationInFlightRef.current = true;

    setIsGenerating(true);
    setGenerationStatus('Creating your world...');

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'background',
          item: `custom_${Date.now()}`,
          customPrompt: prompt,
          provider: 'google',
        }),
      });

      if (!response.ok) {
        throw new Error(`Generation failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response stream');
      }

      let newImagePath = '';
      let sseBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const parts = sseBuffer.split('\n');
        sseBuffer = parts.pop() ?? '';

        for (const line of parts) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            setGenerationStatus(data.message || 'Working...');

            if (data.status === 'error') {
              throw new Error(data.message || 'Generation failed');
            }
            if (data.status === 'complete' && data.image) {
              newImagePath = data.image;
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }

      if (newImagePath) {
        registerUserBackground(newImagePath);
        await loadBackgrounds();
        setBackground(newImagePath);
        setCustomPrompt('');
        onClose();
      }
    } catch (error) {
      console.error('Failed to generate world:', error);
      setGenerationStatus('Failed to create world. Please try again.');
    } finally {
      generationInFlightRef.current = false;
      setIsGenerating(false);
    }
  }, [loadBackgrounds, registerUserBackground, setBackground, onClose]);

  const startVoiceInput = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input is not supported in this browser.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    shouldAutoSubmitRef.current = true;

    recognition.onstart = () => {
      setIsListening(true);
      pendingPromptRef.current = '';
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join('');
      setCustomPrompt(transcript);
      pendingPromptRef.current = transcript;
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      shouldAutoSubmitRef.current = false;
    };

    recognition.onend = () => {
      setIsListening(false);
      if (shouldAutoSubmitRef.current && pendingPromptRef.current.trim()) {
        shouldAutoSubmitRef.current = false;
        setTimeout(() => {
          triggerGeneration(pendingPromptRef.current);
        }, 300);
      }
    };

    recognition.start();
  }, [triggerGeneration]);

  const stopVoiceInput = useCallback((cancelSubmit: boolean = false) => {
    if (cancelSubmit) {
      shouldAutoSubmitRef.current = false;
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  const generateCustomWorld = useCallback(async () => {
    await triggerGeneration(customPrompt);
  }, [triggerGeneration, customPrompt]);

  const handleBrowseMicTile = useCallback(() => {
    flushSync(() => {
      setCustomPrompt('');
      setActiveTab('create');
    });
    requestAnimationFrame(() => {
      startVoiceInput();
    });
  }, [startVoiceInput]);

  if (!portalReady) return null;

  const modalTree = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 bg-black/50 ${Z_BACKDROP}`}
            onClick={onClose}
          />

          <div className={`hidden md:flex fixed inset-0 ${Z_MODAL} items-center justify-center pointer-events-none p-4`}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-[700px] max-h-[85vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto"
            >
              <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                <div className="flex items-center gap-1 bg-gray-200 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('browse')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                      activeTab === 'browse'
                        ? 'bg-white text-gray-800 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    🌍 Browse Worlds
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('create')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                      activeTab === 'create'
                        ? 'bg-white text-gray-800 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    ✨ Create New
                  </button>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-10 h-10 rounded-full hover:bg-gray-200 flex items-center justify-center text-gray-500 text-xl transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'create' ? (
                  <CreateWorldContent
                    customPrompt={customPrompt}
                    setCustomPrompt={setCustomPrompt}
                    isGenerating={isGenerating}
                    isListening={isListening}
                    generationStatus={generationStatus}
                    startVoiceInput={startVoiceInput}
                    stopVoiceInput={stopVoiceInput}
                    generateCustomWorld={generateCustomWorld}
                    triggerGeneration={triggerGeneration}
                  />
                ) : (
                  <BrowseWorldsContent
                    isOpen={isOpen}
                    currentBackground={currentBackground}
                    availableBackgrounds={availableBackgrounds}
                    handleSelectWorld={handleSelectWorld}
                    onCreateWithVoice={handleBrowseMicTile}
                  />
                )}
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`md:hidden fixed inset-x-0 bottom-0 max-h-[88vh] bg-white rounded-t-3xl shadow-2xl ${Z_MODAL} overflow-hidden flex flex-col pb-[env(safe-area-inset-bottom)]`}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>

            <div className="flex items-center gap-1 mx-4 mb-2 bg-gray-200 rounded-xl p-1">
              <button
                type="button"
                onClick={() => setActiveTab('browse')}
                className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-all ${
                  activeTab === 'browse' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
                }`}
              >
                🌍 Browse
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-all ${
                  activeTab === 'create' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
                }`}
              >
                ✨ Create
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 pb-6">
              {activeTab === 'create' ? (
                <CreateWorldContent
                  customPrompt={customPrompt}
                  setCustomPrompt={setCustomPrompt}
                  isGenerating={isGenerating}
                  isListening={isListening}
                  generationStatus={generationStatus}
                  startVoiceInput={startVoiceInput}
                  stopVoiceInput={stopVoiceInput}
                  generateCustomWorld={generateCustomWorld}
                  triggerGeneration={triggerGeneration}
                />
              ) : (
                <BrowseWorldsContent
                  isOpen={isOpen}
                  currentBackground={currentBackground}
                  availableBackgrounds={availableBackgrounds}
                  handleSelectWorld={handleSelectWorld}
                  onCreateWithVoice={handleBrowseMicTile}
                />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(modalTree, document.body);
}

function BrowseWorldsContent({
  isOpen,
  currentBackground,
  availableBackgrounds,
  handleSelectWorld,
  onCreateWithVoice,
}: {
  isOpen: boolean;
  currentBackground: string | null;
  availableBackgrounds: string[];
  handleSelectWorld: (thumbnail: string) => void;
  onCreateWithVoice: () => void;
}) {
  const sortedYourWorlds = useMemo(
    () => sortBackgroundsNewestFirst(availableBackgrounds),
    [availableBackgrounds]
  );
  const [yourWorldsLimit, setYourWorldsLimit] = useState(YOUR_WORLDS_PAGE);
  const yourWorldsAnchorRef = useRef<HTMLDivElement>(null);
  const seeMoreSentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setYourWorldsLimit(YOUR_WORLDS_PAGE);
    }
  }, [isOpen]);

  const visibleYourWorlds = sortedYourWorlds.slice(0, yourWorldsLimit);
  const hasMoreYourWorlds = sortedYourWorlds.length > yourWorldsLimit;

  const loadMoreYourWorlds = () => {
    setYourWorldsLimit((n) => n + YOUR_WORLDS_PAGE);
    requestAnimationFrame(() => {
      seeMoreSentinelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-3">Pick a World</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <motion.button
            type="button"
            key="create-voice"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onCreateWithVoice}
            title="Create with your voice"
            aria-label="Create a new world with your voice. Opens create and starts listening."
            className="relative aspect-video rounded-xl overflow-hidden border-2 border-purple-200 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 shadow-md hover:shadow-lg transition-all ring-offset-2 hover:ring-2 hover:ring-purple-300 flex items-center justify-center"
          >
            <span className="text-6xl md:text-7xl drop-shadow-lg select-none" aria-hidden>
              🎤
            </span>
          </motion.button>

          {PRE_CREATED_WORLDS.map((world) => (
            <motion.button
              key={world.id}
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleSelectWorld(world.thumbnail)}
              className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all ${
                currentBackground === world.thumbnail
                  ? 'border-lime-500 ring-4 ring-lime-200 shadow-lg'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              }`}
            >
              <Image src={world.thumbnail} alt={world.name} fill className="object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <p className="text-white text-xs font-medium truncate">{world.name}</p>
              </div>
              {currentBackground === world.thumbnail && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-lime-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {sortedYourWorlds.length > 0 && (
        <div ref={yourWorldsAnchorRef}>
          <h3 className="text-sm font-medium text-gray-500 mb-3">your worlds</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {visibleYourWorlds.map((bg, index) => (
              <motion.button
                key={bg}
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleSelectWorld(bg)}
                className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all ${
                  currentBackground === bg
                    ? 'border-lime-500 ring-4 ring-lime-200 shadow-lg'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}
              >
                <Image src={bg} alt={`Your world ${index + 1}`} fill className="object-cover" />
                {currentBackground === bg && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-lime-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </motion.button>
            ))}
          </div>

          {hasMoreYourWorlds && (
            <div ref={seeMoreSentinelRef} className="mt-4 flex flex-col items-center gap-2">
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={loadMoreYourWorlds}
                className="w-full max-w-sm py-3 rounded-2xl bg-gradient-to-r from-lime-500 to-emerald-500 text-white font-bold text-base shadow-lg hover:from-lime-600 hover:to-emerald-600 transition-colors"
              >
                See more worlds ({sortedYourWorlds.length - yourWorldsLimit} left)
              </motion.button>
              <p className="text-center text-sm text-gray-500 px-2">
                Pick a picture — it becomes your background!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CreateWorldContent({
  customPrompt,
  setCustomPrompt,
  isGenerating,
  isListening,
  generationStatus,
  startVoiceInput,
  stopVoiceInput,
  generateCustomWorld,
  triggerGeneration,
}: {
  customPrompt: string;
  setCustomPrompt: (value: string) => void;
  isGenerating: boolean;
  isListening: boolean;
  generationStatus: string;
  startVoiceInput: () => void;
  stopVoiceInput: (cancelSubmit?: boolean) => void;
  generateCustomWorld: () => void;
  triggerGeneration: (prompt: string) => void;
}) {
  const handleMicClick = () => {
    if (isGenerating) return;

    if (isListening) {
      stopVoiceInput();
    } else {
      setCustomPrompt('');
      startVoiceInput();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-4">
      {isGenerating ? (
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="text-8xl mb-6"
          >
            🌍
          </motion.div>
          <p className="text-xl text-gray-600 font-medium">{generationStatus || 'Making your world...'}</p>
        </div>
      ) : (
        <>
          <motion.button
            type="button"
            onClick={handleMicClick}
            whileTap={{ scale: 0.95 }}
            className={`relative w-32 h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center text-6xl md:text-7xl shadow-2xl transition-all ${
              isListening
                ? 'bg-gradient-to-br from-red-500 to-pink-500'
                : 'bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
            }`}
          >
            {isListening && (
              <>
                <motion.div
                  className="absolute inset-0 rounded-full bg-red-400"
                  animate={{ scale: [1, 1.3, 1.3], opacity: [0.5, 0, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full bg-red-400"
                  animate={{ scale: [1, 1.5, 1.5], opacity: [0.3, 0, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                />
              </>
            )}

            <span className="relative z-10">{isListening ? '✓' : '🎤'}</span>
          </motion.button>

          <motion.p
            className="mt-6 text-xl md:text-2xl font-bold text-center"
            animate={isListening ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 0.8, repeat: isListening ? Infinity : 0 }}
          >
            {isListening ? (
              <span className="text-red-500">🎤 Tell me your world!</span>
            ) : (
              <span className="text-gray-600">Tap to speak!</span>
            )}
          </motion.p>

          {customPrompt && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 w-full max-w-sm"
            >
              <div className="bg-gray-100 rounded-2xl p-4 min-h-[80px]">
                <p className="text-lg text-gray-700 text-center">&quot;{customPrompt}&quot;</p>
              </div>

              {!isListening && (
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => setCustomPrompt('')}
                    className="flex-1 py-3 rounded-xl bg-gray-200 text-gray-600 font-medium hover:bg-gray-300 transition-colors"
                  >
                    Try Again
                  </button>
                  <button
                    type="button"
                    onClick={generateCustomWorld}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg"
                  >
                    Create! ✨
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {!customPrompt && !isListening && (
            <div className="mt-8">
              <p className="text-sm text-gray-400 mb-3 text-center">Or pick one:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {['🍭 Candy Land', '🚀 Space', '🏰 Castle', '🦕 Dinosaurs'].map((idea) => (
                  <button
                    key={idea}
                    type="button"
                    onClick={() => {
                      const prompt = idea.slice(2).trim();
                      setCustomPrompt(prompt);
                      triggerGeneration(prompt);
                    }}
                    className="px-4 py-2 bg-white border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50 rounded-full text-base font-medium text-gray-700 transition-all shadow-sm"
                  >
                    {idea}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}
