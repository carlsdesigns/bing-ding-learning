import { NextRequest, NextResponse } from 'next/server';
import { recordActivity } from '@/lib/db/sessions';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { activityType, target, correct, attempts, responseTimeMs, aiHintUsed, voicePlayed } = body;

    if (!activityType || !target || typeof correct !== 'boolean') {
      return NextResponse.json(
        { error: 'activityType, target, and correct are required' },
        { status: 400 }
      );
    }

    const activity = await recordActivity({
      sessionId: params.id,
      activityType,
      target,
      correct,
      attempts,
      responseTimeMs,
      aiHintUsed,
      voicePlayed,
    });

    return NextResponse.json(activity);
  } catch (error) {
    console.error('Record activity error:', error);
    return NextResponse.json(
      { error: 'Failed to record activity' },
      { status: 500 }
    );
  }
}
