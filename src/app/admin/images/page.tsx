'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ImageInfo {
  filename: string;
  path: string;
  createdAt: number;
}

interface ItemData {
  item: string;
  type: 'letter' | 'number';
  images: ImageInfo[];
  selectedImage?: string;
}

interface PromptConfig {
  letters: Record<string, { word: string; prompt: string }>;
  numbers: Record<string, { description: string; prompt: string }>;
}

type Tab = 'letters' | 'numbers';
type Provider = 'google' | 'openai';

export default function ImageManagerPage() {
  const [tab, setTab] = useState<Tab>('letters');
  const [letters, setLetters] = useState<ItemData[]>([]);
  const [numbers, setNumbers] = useState<ItemData[]>([]);
  const [selectedItem, setSelectedItem] = useState<ItemData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [provider, setProvider] = useState<Provider>('google');
  const [newImage, setNewImage] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<PromptConfig | null>(null);
  const [editedPrompt, setEditedPrompt] = useState<string>('');
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [savingPrompt, setSavingPrompt] = useState(false);

  useEffect(() => {
    fetchImages();
    fetchPrompts();
  }, []);

  useEffect(() => {
    if (selectedItem && prompts) {
      const config = selectedItem.type === 'letter' 
        ? prompts.letters[selectedItem.item.toUpperCase()]
        : prompts.numbers[selectedItem.item];
      if (config) {
        setEditedPrompt(config.prompt);
        setIsEditingPrompt(false);
      }
    }
  }, [selectedItem, prompts]);

  const fetchImages = async () => {
    const response = await fetch('/api/images');
    const data = await response.json();
    setLetters(data.letters);
    setNumbers(data.numbers);
  };

  const fetchPrompts = async () => {
    const response = await fetch('/api/prompts');
    const data = await response.json();
    setPrompts(data);
  };

  const savePrompt = async () => {
    if (!selectedItem) return;
    
    setSavingPrompt(true);
    try {
      await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedItem.type,
          item: selectedItem.item,
          prompt: editedPrompt,
        }),
      });
      
      await fetchPrompts();
      setIsEditingPrompt(false);
    } catch (error) {
      console.error('Failed to save prompt:', error);
    } finally {
      setSavingPrompt(false);
    }
  };

  const generateImage = async (type: 'letter' | 'number', item: string) => {
    setGenerating(true);
    setProgress([]);
    setNewImage(null);

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, item, provider, customPrompt: editedPrompt }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n').filter(line => line.startsWith('data: '));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));
            setProgress(prev => [...prev, `[${data.status}] ${data.message}`]);

            if (data.status === 'complete' && data.image) {
              setNewImage(data.image);
              await fetchImages();
              
              // Update selected item
              if (selectedItem) {
                const updated = (type === 'letter' ? letters : numbers)
                  .find(i => i.item === item);
                if (updated) {
                  setSelectedItem({ ...updated, images: [...updated.images] });
                }
              }
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    } catch (error) {
      setProgress(prev => [...prev, `[error] ${error}`]);
    } finally {
      setGenerating(false);
    }
  };

  const selectImage = async (type: 'letter' | 'number', item: string, imagePath: string) => {
    await fetch('/api/images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, item, selectedImage: imagePath }),
    });
    await fetchImages();
  };

  const deleteImage = async (imagePath: string) => {
    if (!confirm('Delete this image?')) return;
    
    await fetch(`/api/images?path=${encodeURIComponent(imagePath)}`, {
      method: 'DELETE',
    });
    await fetchImages();
    
    if (selectedItem) {
      setSelectedItem({
        ...selectedItem,
        images: selectedItem.images.filter(img => img.path !== imagePath),
      });
    }
  };

  const items = tab === 'letters' ? letters : numbers;

  return (
    <main className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <Link href="/">
            <Button variant="ghost">← Back to Home</Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">Image Manager</h1>
          <div className="flex gap-2">
            <Button
              variant={provider === 'google' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setProvider('google')}
            >
              Google Imagen
            </Button>
            <Button
              variant={provider === 'openai' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setProvider('openai')}
            >
              OpenAI DALL-E
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <Button
            variant={tab === 'letters' ? 'default' : 'outline'}
            onClick={() => setTab('letters')}
            size="lg"
          >
            Alphabet (A-Z)
          </Button>
          <Button
            variant={tab === 'numbers' ? 'default' : 'outline'}
            onClick={() => setTab('numbers')}
            size="lg"
          >
            Numbers (0-9)
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Item Grid */}
          <Card>
            <CardHeader>
              <CardTitle>Select {tab === 'letters' ? 'Letter' : 'Number'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`grid gap-3 ${tab === 'letters' ? 'grid-cols-6' : 'grid-cols-5'}`}>
                {items.map((item) => (
                  <motion.button
                    key={item.item}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedItem(item)}
                    className={`
                      relative aspect-square rounded-xl text-2xl font-bold
                      flex items-center justify-center transition-all
                      ${selectedItem?.item === item.item
                        ? 'bg-primary-500 text-white ring-4 ring-primary-300'
                        : item.images.length > 0
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }
                    `}
                  >
                    {item.item}
                    {item.images.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                        {item.images.length}
                      </span>
                    )}
                  </motion.button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Selected Item Detail */}
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedItem 
                  ? `${selectedItem.type === 'letter' ? 'Letter' : 'Number'} "${selectedItem.item}"` 
                  : 'Select an item'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedItem ? (
                <div className="space-y-4">
                  {/* Prompt Editor */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-gray-700">
                        Prompt for "{selectedItem.item}"
                        {selectedItem.type === 'letter' && prompts?.letters[selectedItem.item.toUpperCase()] && (
                          <span className="text-gray-500 ml-2">
                            ({prompts.letters[selectedItem.item.toUpperCase()].word})
                          </span>
                        )}
                        {selectedItem.type === 'number' && prompts?.numbers[selectedItem.item] && (
                          <span className="text-gray-500 ml-2">
                            ({prompts.numbers[selectedItem.item].description})
                          </span>
                        )}
                      </label>
                      {isEditingPrompt && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const config = selectedItem.type === 'letter'
                                ? prompts?.letters[selectedItem.item.toUpperCase()]
                                : prompts?.numbers[selectedItem.item];
                              if (config) setEditedPrompt(config.prompt);
                              setIsEditingPrompt(false);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={savePrompt}
                            disabled={savingPrompt}
                          >
                            {savingPrompt ? 'Saving...' : 'Save Prompt'}
                          </Button>
                        </div>
                      )}
                    </div>
                    <textarea
                      value={editedPrompt}
                      onChange={(e) => {
                        setEditedPrompt(e.target.value);
                        setIsEditingPrompt(true);
                      }}
                      className="w-full h-24 p-3 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Enter the prompt for image generation..."
                    />
                    {isEditingPrompt && (
                      <p className="text-xs text-amber-600">
                        Prompt has been modified. Save to update the config file.
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={() => generateImage(selectedItem.type, selectedItem.item)}
                    disabled={generating}
                    className="w-full"
                    size="lg"
                  >
                    {generating ? 'Generating...' : `Generate New Image for "${selectedItem.item}"`}
                  </Button>

                  {/* Progress Log */}
                  {progress.length > 0 && (
                    <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-48 overflow-y-auto">
                      {progress.map((line, i) => (
                        <div key={i}>{line}</div>
                      ))}
                    </div>
                  )}

                  {/* New Image Preview */}
                  {newImage && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="border-4 border-green-500 rounded-xl overflow-hidden"
                    >
                      <p className="bg-green-500 text-white text-center py-1 text-sm font-medium">
                        New Image Generated!
                      </p>
                      <Image
                        src={newImage}
                        alt="Newly generated"
                        width={400}
                        height={400}
                        className="w-full"
                      />
                    </motion.div>
                  )}

                  {/* Existing Images */}
                  {selectedItem.images.length > 0 && (
                    <div>
                      <h3 className="font-medium text-gray-700 mb-2">
                        Existing Versions ({selectedItem.images.length})
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {selectedItem.images.map((img) => (
                          <div
                            key={img.path}
                            className={`relative rounded-lg overflow-hidden border-2 ${
                              selectedItem.selectedImage === img.path
                                ? 'border-primary-500'
                                : 'border-gray-200'
                            }`}
                          >
                            <Image
                              src={img.path}
                              alt={img.filename}
                              width={200}
                              height={200}
                              className="w-full aspect-square object-cover"
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-2 flex gap-1">
                              <Button
                                size="sm"
                                variant={selectedItem.selectedImage === img.path ? 'default' : 'outline'}
                                className="flex-1 text-xs"
                                onClick={() => selectImage(selectedItem.type, selectedItem.item, img.path)}
                              >
                                {selectedItem.selectedImage === img.path ? '✓ Selected' : 'Select'}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="text-xs px-2"
                                onClick={() => deleteImage(img.path)}
                              >
                                🗑
                              </Button>
                            </div>
                            <div className="absolute top-1 right-1 bg-black/50 text-white text-xs px-2 py-0.5 rounded">
                              {new Date(img.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedItem.images.length === 0 && !generating && (
                    <div className="text-center py-12 text-gray-500">
                      <p className="text-4xl mb-2">🖼️</p>
                      <p>No images generated yet</p>
                      <p className="text-sm">Click the button above to generate one</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-4xl mb-2">👈</p>
                  <p>Select a letter or number to manage its images</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
