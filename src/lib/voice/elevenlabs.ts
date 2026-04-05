/**
 * ElevenLabs TTS integration + pronunciation helpers.
 *
 * All spoken text is normalized here before calling the API. To tune how a
 * letter or word sounds, edit LETTER_SPELLOUTS, WORD_TTS_ALIASES, or the
 * regex steps in preprocessText below.
 */
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

/** Bump when preprocess rules change so cached MP3s are regenerated. */
export const TTS_NORMALIZATION_VERSION = 2;

/**
 * How to say each letter name (avoids TTS reading "R" as "are", "H" as a
 * mumbled digraph, "U" as the pronoun "you", etc.).
 */
const LETTER_SPELLOUTS: Record<string, string> = {
  A: 'Ay',
  B: 'Bee',
  C: 'See',
  D: 'Dee',
  E: 'Ee',
  F: 'Eff',
  G: 'Jee',
  H: 'Aitch',
  I: 'Eye',
  J: 'Jay',
  K: 'Kay',
  L: 'Ell',
  M: 'Em',
  N: 'En',
  O: 'Oh',
  P: 'Pee',
  Q: 'Cue',
  R: 'Arr',
  S: 'Ess',
  T: 'Tee',
  U: 'Yoo',
  V: 'Vee',
  W: 'Dubbul yoo',
  X: 'Ex',
  Y: 'Why',
  Z: 'Zee',
};

/** Whole-word respellings for words the model often mumbles or mis-stresses. */
const WORD_TTS_ALIASES: Record<string, string> = {
  yacht: 'yot',
  violin: 'vy-oh-lin',
  moon: 'mewn',
  lion: 'lie-un',
  hat: 'haht',
};

function applyWordAliases(text: string): string {
  let out = text;
  for (const [word, sayAs] of Object.entries(WORD_TTS_ALIASES)) {
    const re = new RegExp(`\\b${word}\\b`, 'gi');
    out = out.replace(re, sayAs);
  }
  return out;
}

function preprocessText(text: string): string {
  let processed = text;

  // Phrases with digit 0 before generic digit replacement (avoid breaking /^0/)
  processed = processed.replace(
    /^0\s+is\s+for\s+zero\b/gi,
    'Zee roh is for the number zee roh'
  );
  processed = processed.replace(/^0\s+is\s+for\b/gi, 'Zee roh is for');
  processed = processed.replace(/\bnumber\s+0\b/gi, 'number zee roh');
  processed = processed.replace(/\bFind\s+the\s+number\s+0\b/gi, 'Find the number zee roh');
  processed = processed.replace(/\bThat'?s\s+0\b/gi, "That's zee roh");

  // Remaining lone digit 0 (not inside 10, 20, …)
  processed = processed.replace(/(?<!\d)0(?!\d)/g, 'zee roh');

  // Single letter + period (e.g. "H. huh. H is for …" from the letter game)
  processed = processed.replace(/\b([A-Z])\.\s/g, (match, letter: string) => {
    const pronunciation = LETTER_SPELLOUTS[letter.toUpperCase()];
    return pronunciation ? `${pronunciation}. ` : match;
  });

  // "letter C" / "the letter A"
  processed = processed.replace(
    /\b(letter|the letter)\s+([A-Z])\b/gi,
    (match, prefix: string, letter: string) => {
      const pronunciation = LETTER_SPELLOUTS[letter.toUpperCase()];
      return pronunciation ? `${prefix} ${pronunciation}` : match;
    }
  );

  // "Find the Y" / "the R" (uppercase single letter as token)
  processed = processed.replace(/\bthe\s+([A-Z])\b(?!\w)/gi, (match, letter: string) => {
    const pronunciation = LETTER_SPELLOUTS[letter.toUpperCase()];
    return pronunciation ? `the ${pronunciation}` : match;
  });

  // "Spot B." / "Tap 3" — "Find B" style (letter not after "the")
  processed = processed.replace(/\b(Find|Spot|Tap)\s+([A-Z])\b(?![a-z])/gi, (match, verb, letter) => {
    const pronunciation = LETTER_SPELLOUTS[(letter as string).toUpperCase()];
    return pronunciation ? `${verb} ${pronunciation}` : match;
  });

  // "A is for Apple" → spell letter name only at string start (playground / warm-cache)
  processed = processed.replace(/^([A-Z])\s+is\s+for\b/gi, (match, letter: string) => {
    const pronunciation = LETTER_SPELLOUTS[letter.toUpperCase()];
    return pronunciation ? `${pronunciation} is for` : match;
  });

  // Tricky dictionary words (yacht, violin, …)
  processed = applyWordAliases(processed);

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
