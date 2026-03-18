import { NextRequest, NextResponse } from 'next/server';
import { generateProgressReport, getWeeklyStats } from '@/lib/db/reports';

export async function GET(
  request: NextRequest,
  { params }: { params: { learnerId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const moduleType = searchParams.get('moduleType') || undefined;
    const type = searchParams.get('type') || 'full';

    if (type === 'weekly') {
      const stats = await getWeeklyStats(params.learnerId);
      return NextResponse.json(stats);
    }

    const report = await generateProgressReport(params.learnerId, moduleType);

    return NextResponse.json(report);
  } catch (error) {
    console.error('Generate report error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
