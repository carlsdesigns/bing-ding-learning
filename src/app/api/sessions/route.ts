import { NextRequest, NextResponse } from 'next/server';
import { createSession, getLearnerSessions } from '@/lib/db/sessions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { learnerId, moduleType, difficulty } = body;

    if (!learnerId || !moduleType) {
      return NextResponse.json(
        { error: 'learnerId and moduleType are required' },
        { status: 400 }
      );
    }

    const session = await createSession({
      learnerId,
      moduleType,
      difficulty,
    });

    return NextResponse.json(session);
  } catch (error) {
    console.error('Create session error:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const learnerId = searchParams.get('learnerId');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!learnerId) {
      return NextResponse.json(
        { error: 'learnerId is required' },
        { status: 400 }
      );
    }

    const sessions = await getLearnerSessions(learnerId, limit);

    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Get sessions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}
