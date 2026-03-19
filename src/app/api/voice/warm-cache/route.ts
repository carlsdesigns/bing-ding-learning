import { NextRequest, NextResponse } from 'next/server';
import { textToSpeech } from '@/lib/voice';
import { LETTER_CONFIG, NUMBER_CONFIG } from '@/../scripts/image-config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const CACHE_DIR = path.join(process.cwd(), 'public', 'audio', 'tts-cache');

function getCacheKey(text: string, voiceId?: string): string {
  const normalizedText = text.toLowerCase().trim();
  const key = `${normalizedText}-${voiceId || 'default'}`;
  return crypto.createHash('md5').update(key).digest('hex');
}

function getCachePath(cacheKey: string): string {
  return path.join(CACHE_DIR, `${cacheKey}.mp3`);
}

function ensureCacheDir(): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function isInCache(cacheKey: string): boolean {
  return fs.existsSync(getCachePath(cacheKey));
}

function saveToCache(cacheKey: string, audioBuffer: ArrayBuffer): void {
  ensureCacheDir();
  fs.writeFileSync(getCachePath(cacheKey), Buffer.from(audioBuffer));
}

export async function POST(request: NextRequest) {
  try {
    ensureCacheDir();
    
    const results: { phrase: string; status: 'cached' | 'generated' | 'error'; error?: string }[] = [];
    
    // Generate all letter phrases: "A is for Apple", etc.
    for (const [letter, config] of Object.entries(LETTER_CONFIG)) {
      const phrase = `${letter} is for ${config.word}!`;
      const cacheKey = getCacheKey(phrase);
      
      if (isInCache(cacheKey)) {
        results.push({ phrase, status: 'cached' });
        continue;
      }
      
      try {
        console.log(`Generating TTS for: ${phrase}`);
        const audioBuffer = await textToSpeech(phrase);
        saveToCache(cacheKey, audioBuffer);
        results.push({ phrase, status: 'generated' });
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Failed to generate: ${phrase}`, error);
        results.push({ 
          phrase, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }
    
    // Generate all number phrases: "1 is for One balloon", etc.
    for (const [number, config] of Object.entries(NUMBER_CONFIG)) {
      const phrase = `${number} is for ${config.description}!`;
      const cacheKey = getCacheKey(phrase);
      
      if (isInCache(cacheKey)) {
        results.push({ phrase, status: 'cached' });
        continue;
      }
      
      try {
        console.log(`Generating TTS for: ${phrase}`);
        const audioBuffer = await textToSpeech(phrase);
        saveToCache(cacheKey, audioBuffer);
        results.push({ phrase, status: 'generated' });
        
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Failed to generate: ${phrase}`, error);
        results.push({ 
          phrase, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }
    
    const summary = {
      total: results.length,
      cached: results.filter(r => r.status === 'cached').length,
      generated: results.filter(r => r.status === 'generated').length,
      errors: results.filter(r => r.status === 'error').length,
      results,
    };
    
    return NextResponse.json(summary);
  } catch (error) {
    console.error('Cache warm error:', error);
    return NextResponse.json(
      { error: 'Failed to warm cache' },
      { status: 500 }
    );
  }
}

export async function GET() {
  ensureCacheDir();
  
  const cachedFiles = fs.existsSync(CACHE_DIR) 
    ? fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.mp3'))
    : [];
  
  return NextResponse.json({
    cacheDir: CACHE_DIR,
    cachedCount: cachedFiles.length,
    cachedFiles,
  });
}
