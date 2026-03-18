import { NextRequest, NextResponse } from 'next/server';
import { chat, type AIProvider } from '@/lib/ai';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, provider, model, sessionId } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    const response = await chat(messages, {
      provider: provider as AIProvider,
      model,
    });

    if (sessionId) {
      await prisma.aIInteraction.create({
        data: {
          sessionId,
          provider: response.provider,
          model: response.model,
          prompt: messages[messages.length - 1]?.content || '',
          response: response.content,
          tokensUsed: response.tokensUsed,
        },
      });
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('AI chat error:', error);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
}
