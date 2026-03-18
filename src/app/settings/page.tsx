'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAIStore, useLearningStore } from '@/stores';
import { AVAILABLE_MODELS, type AIProvider } from '@/lib/ai/types';

export default function SettingsPage() {
  const {
    provider,
    model,
    setProvider,
    setModel,
  } = useAIStore();

  const {
    voiceEnabled,
    hintsEnabled,
    difficulty,
    toggleVoice,
    toggleHints,
    setDifficulty,
  } = useLearningStore();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm">
              ← Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">Settings</h1>
          <div className="w-20" />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Provider</CardTitle>
              <CardDescription>
                Choose which AI model to use for hints and encouragement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(['openai', 'anthropic', 'google'] as AIProvider[]).map((p) => (
                  <Button
                    key={p}
                    variant={provider === p ? 'default' : 'outline'}
                    onClick={() => setProvider(p)}
                    className="capitalize"
                  >
                    {p === 'openai' ? 'OpenAI' : p === 'anthropic' ? 'Anthropic' : 'Google'}
                  </Button>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Model
                </label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-primary-500"
                >
                  {AVAILABLE_MODELS[provider].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Learning Settings</CardTitle>
              <CardDescription>
                Customize the learning experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <div className="font-medium">Voice Feedback</div>
                  <div className="text-sm text-gray-500">
                    Hear letters and numbers spoken aloud
                  </div>
                </div>
                <Button
                  variant={voiceEnabled ? 'default' : 'outline'}
                  onClick={toggleVoice}
                >
                  {voiceEnabled ? '🔊 On' : '🔇 Off'}
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <div className="font-medium">AI Hints</div>
                  <div className="text-sm text-gray-500">
                    Get helpful hints when stuck
                  </div>
                </div>
                <Button
                  variant={hintsEnabled ? 'default' : 'outline'}
                  onClick={toggleHints}
                >
                  {hintsEnabled ? '💡 On' : '💡 Off'}
                </Button>
              </div>

              <div>
                <label className="block font-medium mb-2">Difficulty</label>
                <div className="flex gap-2">
                  {(['easy', 'medium', 'hard'] as const).map((d) => (
                    <Button
                      key={d}
                      variant={difficulty === d ? 'default' : 'outline'}
                      onClick={() => setDifficulty(d)}
                      className="flex-1 capitalize"
                    >
                      {d}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                API keys are configured via environment variables for security
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• <code className="bg-gray-100 px-1 rounded">OPENAI_API_KEY</code> - OpenAI GPT models</p>
                <p>• <code className="bg-gray-100 px-1 rounded">ANTHROPIC_API_KEY</code> - Claude models</p>
                <p>• <code className="bg-gray-100 px-1 rounded">GOOGLE_AI_API_KEY</code> - Gemini models</p>
                <p>• <code className="bg-gray-100 px-1 rounded">ELEVENLABS_API_KEY</code> - Voice synthesis</p>
              </div>
              <p className="mt-4 text-sm text-gray-500">
                See <code className="bg-gray-100 px-1 rounded">.env.example</code> for all configuration options.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
