import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

const BACKGROUNDS_DIR = path.join(process.cwd(), 'public', 'images', 'backgrounds');

export async function GET() {
  try {
    // Ensure directory exists
    if (!fs.existsSync(BACKGROUNDS_DIR)) {
      fs.mkdirSync(BACKGROUNDS_DIR, { recursive: true });
    }

    const files = fs.readdirSync(BACKGROUNDS_DIR);
    const backgrounds = files
      .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
      .filter(f => f.startsWith('world_custom_')) // Only user-generated
      .map(f => `/images/backgrounds/${f}`)
      .reverse(); // Newest first

    return NextResponse.json({ backgrounds });
  } catch (error) {
    console.error('Failed to list backgrounds:', error);
    return NextResponse.json({ backgrounds: [] });
  }
}
