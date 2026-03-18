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

export async function textToSpeech(
  text: string,
  config?: VoiceConfig
): Promise<ArrayBuffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is not configured');
  }

  const voiceId = config?.voiceId || process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'; // Default: Sarah

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
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: config?.stability ?? parseFloat(process.env.ELEVENLABS_STABILITY || '0.5'),
          similarity_boost: config?.similarityBoost ?? parseFloat(process.env.ELEVENLABS_SIMILARITY_BOOST || '0.75'),
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
