import { NextResponse } from 'next/server';
import { getVoices, RECOMMENDED_VOICES } from '@/lib/voice';

export async function GET() {
  try {
    const voices = await getVoices();

    return NextResponse.json({
      voices,
      recommended: RECOMMENDED_VOICES,
    });
  } catch (error) {
    console.error('Get voices error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch voices' },
      { status: 500 }
    );
  }
}
