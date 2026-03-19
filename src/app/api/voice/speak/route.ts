import { NextRequest, NextResponse } from 'next/server';
import { textToSpeech } from '@/lib/voice';
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

function getFromCache(cacheKey: string): Buffer | null {
  const cachePath = getCachePath(cacheKey);
  if (fs.existsSync(cachePath)) {
    console.log(`TTS cache hit: ${cacheKey}`);
    return fs.readFileSync(cachePath);
  }
  return null;
}

function saveToCache(cacheKey: string, audioBuffer: ArrayBuffer): void {
  ensureCacheDir();
  const cachePath = getCachePath(cacheKey);
  fs.writeFileSync(cachePath, Buffer.from(audioBuffer));
  console.log(`TTS cached: ${cacheKey}`);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voiceId, stability, similarityBoost } = body;

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const cacheKey = getCacheKey(text, voiceId);
    
    // Check cache first
    const cachedAudio = getFromCache(cacheKey);
    if (cachedAudio) {
      return new NextResponse(cachedAudio, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': cachedAudio.byteLength.toString(),
          'X-TTS-Cache': 'hit',
        },
      });
    }

    // Generate new audio via ElevenLabs
    const audioBuffer = await textToSpeech(text, {
      voiceId,
      stability,
      similarityBoost,
    });

    // Save to cache for future use
    saveToCache(cacheKey, audioBuffer);

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'X-TTS-Cache': 'miss',
      },
    });
  } catch (error) {
    console.error('Text to speech error:', error);
    return NextResponse.json(
      { error: 'Failed to generate speech' },
      { status: 500 }
    );
  }
}
