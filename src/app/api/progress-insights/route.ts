import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { resolveGoogleGeminiModel } from '@/lib/ai/resolve-gemini-model';

const TIMEOUT_MS = 15_000;

export async function POST(request: NextRequest) {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
        { error: 'AI is not configured (GOOGLE_AI_API_KEY).' },
        { status: 503 }
      );
  }

  try {
    const body = await request.json();
    const prompt = typeof body.prompt === 'string' ? body.prompt : '';
    if (!prompt || prompt.length > 48_000) {
      return NextResponse.json({ error: 'Invalid prompt' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = resolveGoogleGeminiModel(process.env.GOOGLE_MODEL);
    const model = genAI.getGenerativeModel({ model: modelName });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.65,
        maxOutputTokens: 2048,
      },
    });

    clearTimeout(timer);
    const text = result.response.text();
    if (!text?.trim()) {
      return NextResponse.json({ error: 'Empty AI response' }, { status: 502 });
    }

    return NextResponse.json({ text: text.trim() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('[progress-insights]', e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
