import { NextRequest, NextResponse } from 'next/server';
import { generateEncouragement, type AIProvider } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { correct, provider } = body as {
      correct: boolean;
      provider?: AIProvider;
    };

    if (typeof correct !== 'boolean') {
      return NextResponse.json(
        { error: 'correct boolean is required' },
        { status: 400 }
      );
    }

    const message = await generateEncouragement(correct, provider);

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Generate encouragement error:', error);
    return NextResponse.json(
      { error: 'Failed to generate encouragement' },
      { status: 500 }
    );
  }
}
