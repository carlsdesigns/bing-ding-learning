import { NextRequest, NextResponse } from 'next/server';
import { textToSpeech } from '@/lib/voice';
import { put, head } from '@vercel/blob';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Local cache directory for development
const CACHE_DIR = path.join(process.cwd(), 'public', 'audio', 'tts-cache');

// Check if we're on Vercel (use Blob storage) or local (use filesystem)
const isVercel = process.env.VERCEL === '1';

function getCacheKey(text: string, voiceId?: string): string {
  const normalizedText = text.toLowerCase().trim();
  const key = `${normalizedText}-${voiceId || 'default'}`;
  return crypto.createHash('md5').update(key).digest('hex');
}

// Local filesystem cache functions (for development)
function getLocalCachePath(cacheKey: string): string {
  return path.join(CACHE_DIR, `${cacheKey}.mp3`);
}

function ensureLocalCacheDir(): boolean {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    return true;
  } catch {
    return false;
  }
}

function getFromLocalCache(cacheKey: string): Buffer | null {
  try {
    const cachePath = getLocalCachePath(cacheKey);
    if (fs.existsSync(cachePath)) {
      console.log(`[TTS] Local cache hit: ${cacheKey}`);
      return fs.readFileSync(cachePath);
    }
  } catch (error) {
    console.log('[TTS] Local cache read error:', error);
  }
  return null;
}

function saveToLocalCache(cacheKey: string, audioBuffer: ArrayBuffer): void {
  try {
    if (ensureLocalCacheDir()) {
      const cachePath = getLocalCachePath(cacheKey);
      fs.writeFileSync(cachePath, Buffer.from(audioBuffer));
      console.log(`[TTS] Saved to local cache: ${cacheKey}`);
    }
  } catch (error) {
    console.log('[TTS] Local cache write error:', error);
  }
}

// Vercel Blob cache functions (for production)
async function getFromBlobCache(cacheKey: string): Promise<ArrayBuffer | null> {
  try {
    const blobPath = `tts-cache/${cacheKey}.mp3`;
    const blobInfo = await head(blobPath);
    
    if (blobInfo) {
      console.log(`[TTS] Blob cache hit: ${cacheKey}`);
      const response = await fetch(blobInfo.url);
      return response.arrayBuffer();
    }
  } catch (error) {
    // head() throws if blob doesn't exist - this is expected for cache misses
    console.log(`[TTS] Blob cache miss: ${cacheKey}`);
  }
  return null;
}

async function saveToBlobCache(cacheKey: string, audioBuffer: ArrayBuffer): Promise<void> {
  try {
    const blobPath = `tts-cache/${cacheKey}.mp3`;
    await put(blobPath, audioBuffer, {
      access: 'public',
      contentType: 'audio/mpeg',
    });
    console.log(`[TTS] Saved to Blob cache: ${cacheKey}`);
  } catch (error) {
    console.error('[TTS] Blob cache write error:', error);
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
    
    // Check cache first (Blob on Vercel, filesystem locally)
    let cachedAudio: ArrayBuffer | Buffer | null = null;
    
    if (isVercel) {
      cachedAudio = await getFromBlobCache(cacheKey);
    } else {
      cachedAudio = getFromLocalCache(cacheKey);
    }
    
    if (cachedAudio) {
      const uint8Array = new Uint8Array(cachedAudio);
      return new NextResponse(uint8Array, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': uint8Array.byteLength.toString(),
          'X-TTS-Cache': 'hit',
        },
      });
    }

    // Generate new audio via ElevenLabs
    console.log(`[TTS] Generating audio for: "${text.substring(0, 50)}..."`);
    const audioBuffer = await textToSpeech(text, {
      voiceId,
      stability,
      similarityBoost,
    });

    // Save to cache for future use (Blob on Vercel, filesystem locally)
    if (isVercel) {
      await saveToBlobCache(cacheKey, audioBuffer);
    } else {
      saveToLocalCache(cacheKey, audioBuffer);
    }

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'X-TTS-Cache': 'miss',
      },
    });
  } catch (error) {
    console.error('[TTS] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
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
