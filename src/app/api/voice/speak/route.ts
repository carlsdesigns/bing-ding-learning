import { NextRequest, NextResponse } from 'next/server';
import { textToSpeech } from '@/lib/voice';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voiceId, stability, similarityBoost } = body;

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const audioBuffer = await textToSpeech(text, {
      voiceId,
      stability,
      similarityBoost,
    });

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
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
