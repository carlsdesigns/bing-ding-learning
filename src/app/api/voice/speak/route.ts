import { NextRequest, NextResponse } from 'next/server';
import { textToSpeech } from '@/lib/voice';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const CACHE_DIR = path.join(process.cwd(), 'public', 'audio', 'tts-cache');

// Check if we're in a read-only environment (like Vercel)
const isReadOnlyEnvironment = process.env.VERCEL === '1';

function getCacheKey(text: string, voiceId?: string): string {
  const normalizedText = text.toLowerCase().trim();
  const key = `${normalizedText}-${voiceId || 'default'}`;
  return crypto.createHash('md5').update(key).digest('hex');
}

function getCachePath(cacheKey: string): string {
  return path.join(CACHE_DIR, `${cacheKey}.mp3`);
}

function ensureCacheDir(): boolean {
  if (isReadOnlyEnvironment) return false;
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    return true;
  } catch {
    return false;
  }
}

function getFromCache(cacheKey: string): Buffer | null {
  try {
    const cachePath = getCachePath(cacheKey);
    if (fs.existsSync(cachePath)) {
      console.log(`TTS cache hit: ${cacheKey}`);
      return fs.readFileSync(cachePath);
    }
  } catch (error) {
    console.log('Cache read error (expected on Vercel):', error);
  }
  return null;
}

function saveToCache(cacheKey: string, audioBuffer: ArrayBuffer): void {
  if (isReadOnlyEnvironment) {
    console.log('Skipping cache save (read-only environment)');
    return;
  }
  try {
    if (ensureCacheDir()) {
      const cachePath = getCachePath(cacheKey);
      fs.writeFileSync(cachePath, Buffer.from(audioBuffer));
      console.log(`TTS cached: ${cacheKey}`);
    }
  } catch (error) {
    console.log('Cache write error:', error);
  }
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
      // Convert Buffer to Uint8Array for NextResponse compatibility
      const uint8Array = new Uint8Array(cachedAudio);
      return new NextResponse(uint8Array, {
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check for common issues
    if (errorMessage.includes('ELEVENLABS_API_KEY')) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured. Add ELEVENLABS_API_KEY to environment variables.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: `Failed to generate speech: ${errorMessage}` },
      { status: 500 }
    );
  }
}
