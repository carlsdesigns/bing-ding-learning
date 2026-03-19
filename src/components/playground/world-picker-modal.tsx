'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { usePlaygroundStore } from '@/stores/playground-store';

const PRE_CREATED_WORLDS = [
  { id: 'blank', name: 'Blank', thumbnail: null },
  { id: 'undersea', name: 'Under the Sea', thumbnail: '/images/backgrounds/world_undersea.jpg' },
  { id: 'land', name: 'The Land', thumbnail: '/images/backgrounds/world_land.jpg' },
  { id: 'schoolyard', name: 'Schoolyard', thumbnail: '/images/backgrounds/world_schoolyard.jpg' },
  { id: 'clouds', name: 'In the Clouds', thumbnail: '/images/backgrounds/world_clouds.jpg' },
  { id: 'stars', name: 'In the Stars', thumbnail: '/images/backgrounds/world_stars.jpg' },
  { id: 'frozen', name: 'Frozen World', thumbnail: '/images/backgrounds/world_frozen.jpg' },
  { id: 'desert', name: 'Desert', thumbnail: '/images/backgrounds/world_desert.jpg' },
];

type Tab = 'browse' | 'create';

interface WorldPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WorldPickerModal({ isOpen, onClose }: WorldPickerModalProps) {
  const { currentBackground, setBackground, availableBackgrounds, loadBackgrounds } = usePlaygroundStore();
  const [activeTab, setActiveTab] = useState<Tab>('browse');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const pendingPromptRef = useRef<string>('');
  const shouldAutoSubmitRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      loadBackgrounds();
      setActiveTab('browse');
    }
  }, [isOpen, loadBackgrounds]);

  const handleSelectWorld = (thumbnail: string | null) => {
    setBackground(thumbnail);
    onClose();
  };

  const startVoiceInput = () => {
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
        .map(result => result[0].transcript)
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
      // Auto-submit when user stops talking (if we have a prompt)
      if (shouldAutoSubmitRef.current && pendingPromptRef.current.trim()) {
        shouldAutoSubmitRef.current = false;
        // Small delay to ensure state is updated
        setTimeout(() => {
          triggerGeneration(pendingPromptRef.current);
        }, 300);
      }
    };

    recognition.start();
  };

  const stopVoiceInput = (cancelSubmit: boolean = false) => {
    if (cancelSubmit) {
      shouldAutoSubmitRef.current = false;
    }
    // Note: shouldAutoSubmitRef stays true for normal stops - auto-submit will happen in onend
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const triggerGeneration = async (prompt: string) => {
    if (!prompt.trim() || isGenerating) return;

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

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response stream');
      }

      let newImagePath = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n').filter(line => line.startsWith('data: '));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));
            setGenerationStatus(data.message || 'Working...');

            if (data.status === 'complete' && data.image) {
              newImagePath = data.image;
            }

            if (data.status === 'error') {
              throw new Error(data.message);
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }

      if (newImagePath) {
        await loadBackgrounds();
        setBackground(newImagePath);
        setCustomPrompt('');
        onClose();
      }
    } catch (error) {
      console.error('Failed to generate world:', error);
      setGenerationStatus('Failed to create world. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateCustomWorld = async () => {
    await triggerGeneration(customPrompt);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[400]"
            onClick={onClose}
          />

          {/* Desktop Modal - centered, wide */}
          <div className="hidden md:flex fixed inset-0 z-[401] items-center justify-center pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-[700px] max-h-[85vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto"
            >
            {/* Header with tabs */}
            <div className="flex items-center justify-between p-4 border-b bg-gray-50">
              <div className="flex items-center gap-1 bg-gray-200 rounded-xl p-1">
                <button
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
                onClick={onClose}
                className="w-10 h-10 rounded-full hover:bg-gray-200 flex items-center justify-center text-gray-500 text-xl transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Content */}
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
                  currentBackground={currentBackground}
                  availableBackgrounds={availableBackgrounds}
                  handleSelectWorld={handleSelectWorld}
                />
              )}
            </div>
            </motion.div>
          </div>

          {/* Mobile Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="md:hidden fixed inset-x-0 bottom-0 max-h-[90vh] bg-white rounded-t-3xl shadow-2xl z-[401] overflow-hidden flex flex-col"
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 mx-4 mb-2 bg-gray-200 rounded-xl p-1">
              <button
                onClick={() => setActiveTab('browse')}
                className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-all ${
                  activeTab === 'browse'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-500'
                }`}
              >
                🌍 Browse
              </button>
              <button
                onClick={() => setActiveTab('create')}
                className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-all ${
                  activeTab === 'create'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-500'
                }`}
              >
                ✨ Create
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 pb-8">
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
                  currentBackground={currentBackground}
                  availableBackgrounds={availableBackgrounds}
                  handleSelectWorld={handleSelectWorld}
                />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Browse Worlds Content Component
function BrowseWorldsContent({
  currentBackground,
  availableBackgrounds,
  handleSelectWorld,
}: {
  currentBackground: string | null;
  availableBackgrounds: string[];
  handleSelectWorld: (thumbnail: string | null) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Pre-created worlds */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-3">Pick a World</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PRE_CREATED_WORLDS.map((world) => (
            <motion.button
              key={world.id}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleSelectWorld(world.thumbnail)}
              className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all ${
                currentBackground === world.thumbnail
                  ? 'border-lime-500 ring-4 ring-lime-200 shadow-lg'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              }`}
            >
              {world.thumbnail ? (
                <Image
                  src={world.thumbnail}
                  alt={world.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center">
                  <span className="text-2xl">⬜</span>
                </div>
              )}
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

      {/* User-created worlds */}
      {availableBackgrounds.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-3">Your Worlds</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {availableBackgrounds.map((bg, index) => (
              <motion.button
                key={bg}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleSelectWorld(bg)}
                className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all ${
                  currentBackground === bg
                    ? 'border-lime-500 ring-4 ring-lime-200 shadow-lg'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}
              >
                <Image
                  src={bg}
                  alt={`Custom world ${index + 1}`}
                  fill
                  className="object-cover"
                />
                {currentBackground === bg && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-lime-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Create World Content Component - Toddler-friendly with big mic button
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
  // Combined action: if listening, stop (auto-submit happens in onend). If not, start listening.
  const handleMicClick = () => {
    if (isGenerating) return;
    
    if (isListening) {
      // Just stop - the auto-submit happens in the speech recognition onend handler
      stopVoiceInput();
    } else {
      setCustomPrompt(''); // Clear previous
      startVoiceInput();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-4">
      {isGenerating ? (
        // Generating state
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
          {/* Big Mic Button */}
          <motion.button
            onClick={handleMicClick}
            whileTap={{ scale: 0.95 }}
            className={`relative w-32 h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center text-6xl md:text-7xl shadow-2xl transition-all ${
              isListening
                ? 'bg-gradient-to-br from-red-500 to-pink-500'
                : 'bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
            }`}
          >
            {/* Pulse rings when listening */}
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
            
            <span className="relative z-10">
              {isListening ? '✓' : '🎤'}
            </span>
          </motion.button>

          {/* Simple instruction */}
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

          {/* Transcript display area */}
          {customPrompt && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 w-full max-w-sm"
            >
              <div className="bg-gray-100 rounded-2xl p-4 min-h-[80px]">
                <p className="text-lg text-gray-700 text-center">
                  "{customPrompt}"
                </p>
              </div>
              
              {/* Manual create button if they want to edit or re-submit */}
              {!isListening && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setCustomPrompt('')}
                    className="flex-1 py-3 rounded-xl bg-gray-200 text-gray-600 font-medium hover:bg-gray-300 transition-colors"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={generateCustomWorld}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg"
                  >
                    Create! ✨
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* Quick idea buttons - only show when no prompt and not listening */}
          {!customPrompt && !isListening && (
            <div className="mt-8">
              <p className="text-sm text-gray-400 mb-3 text-center">Or pick one:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {['🍭 Candy Land', '🚀 Space', '🏰 Castle', '🦕 Dinosaurs'].map((idea) => (
                  <button
                    key={idea}
                    onClick={() => {
                      const prompt = idea.slice(2).trim(); // Remove emoji
                      setCustomPrompt(prompt);
                      // Call triggerGeneration directly with the prompt
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

// Add type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}
