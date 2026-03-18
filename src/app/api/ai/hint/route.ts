import { NextRequest, NextResponse } from 'next/server';
import { generateHint, type AIProvider, type LearningContext } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { context, provider } = body as {
      context: LearningContext;
      provider?: AIProvider;
    };

    if (!context || !context.moduleType || !context.currentItem) {
      return NextResponse.json(
        { error: 'Learning context is required' },
        { status: 400 }
      );
    }

    const hint = await generateHint(context, provider);

    return NextResponse.json({ hint });
  } catch (error) {
    console.error('Generate hint error:', error);
    return NextResponse.json(
      { error: 'Failed to generate hint' },
      { status: 500 }
    );
  }
}
