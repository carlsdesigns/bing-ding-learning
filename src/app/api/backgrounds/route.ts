import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';
import * as fs from 'fs';
import * as path from 'path';

const isVercel = process.env.VERCEL === '1';
const BACKGROUNDS_DIR = path.join(process.cwd(), 'public', 'images', 'backgrounds');

export async function GET() {
  try {
    if (isVercel) {
      // Fetch from Vercel Blob storage
      const { blobs } = await list({ prefix: 'images/backgrounds/world_custom_' });
      const backgrounds = blobs
        .map(blob => blob.url)
        .reverse(); // Newest first
      
      return NextResponse.json({ backgrounds });
    } else {
      // Local filesystem
      if (!fs.existsSync(BACKGROUNDS_DIR)) {
        fs.mkdirSync(BACKGROUNDS_DIR, { recursive: true });
      }

      const files = fs.readdirSync(BACKGROUNDS_DIR);
      const backgrounds = files
        .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
        .filter(f => f.startsWith('world_custom_'))
        .map(f => `/images/backgrounds/${f}`)
        .reverse();

      return NextResponse.json({ backgrounds });
    }
  } catch (error) {
    console.error('Failed to list backgrounds:', error);
    return NextResponse.json({ backgrounds: [] });
  }
}
