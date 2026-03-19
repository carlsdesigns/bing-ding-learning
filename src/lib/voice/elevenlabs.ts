export interface VoiceConfig {
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
}

export interface VoiceSettings {
  stability: number;
  similarity_boost: number;
}

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

const LETTER_PRONUNCIATIONS: Record<string, string> = {
  A: 'Ay', B: 'Bee', C: 'See', D: 'Dee', E: 'Ee',
  F: 'Eff', G: 'Jee', H: 'Aych', I: 'Eye', J: 'Jay',
  K: 'Kay', L: 'Ell', M: 'Em', N: 'En', O: 'Oh',
  P: 'Pee', Q: 'Queue', R: 'Are', S: 'Ess', T: 'Tee',
  U: 'You', V: 'Vee', W: 'Double-you', X: 'Ex', Y: 'Why', Z: 'Zee',
};

function preprocessText(text: string): string {
  let processed = text;
  
  // Replace single letter references with phonetic pronunciations
  // Match patterns like "letter C" or "the letter A"
  processed = processed.replace(
    /\b(letter|the letter)\s+([A-Z])\b/gi,
    (match, prefix, letter) => {
      const pronunciation = LETTER_PRONUNCIATIONS[letter.toUpperCase()];
      return pronunciation ? `${prefix} ${pronunciation}` : match;
    }
  );
  
  // Replace standalone single letters at word boundaries
  // "Find the C" -> "Find the See"
  processed = processed.replace(
    /\bthe\s+([A-Z])\b(?!\w)/gi,
    (match, letter) => {
      const pronunciation = LETTER_PRONUNCIATIONS[letter.toUpperCase()];
      return pronunciation ? `the ${pronunciation}` : match;
    }
  );
  
  // Add slight pause at end to prevent cutoff
  if (!processed.endsWith('.') && !processed.endsWith('!') && !processed.endsWith('?')) {
    processed += '.';
  }
  
  return processed;
}

export async function textToSpeech(
  text: string,
  config?: VoiceConfig
): Promise<ArrayBuffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is not configured');
  }

  const voiceId = config?.voiceId || process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'; // Default: Sarah
  
  // Preprocess text for better pronunciation
  const processedText = preprocessText(text);

  const response = await fetch(
    `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text: processedText,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: {
          stability: config?.stability ?? parseFloat(process.env.ELEVENLABS_STABILITY || '0.6'),
          similarity_boost: config?.similarityBoost ?? parseFloat(process.env.ELEVENLABS_SIMILARITY_BOOST || '0.8'),
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${error}`);
  }

  return response.arrayBuffer();
}

export async function getVoices(): Promise<Voice[]> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is not configured');
  }

  const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
    headers: {
      'xi-api-key': apiKey,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch voices');
  }

  const data = await response.json();
  return data.voices;
}

export interface Voice {
  voice_id: string;
  name: string;
  category: string;
  labels: Record<string, string>;
  preview_url: string;
}

export const RECOMMENDED_VOICES = {
  childFriendly: [
    { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', description: 'Soft, friendly female voice' },
    { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', description: 'Warm male voice' },
    { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', description: 'Clear, gentle female voice' },
  ],
};
