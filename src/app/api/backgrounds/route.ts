import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';
import * as fs from 'fs';
import * as path from 'path';

const isVercel = process.env.VERCEL === '1';
const BACKGROUNDS_DIR = path.join(process.cwd(), 'public', 'images', 'backgrounds');

export async function GET() {
  const backgrounds: string[] = [];
  
  try {
    // Always read from filesystem first (works on both local and Vercel for deployed files)
    if (fs.existsSync(BACKGROUNDS_DIR)) {
      const files = fs.readdirSync(BACKGROUNDS_DIR);
      const localBackgrounds = files
        .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
        .filter(f => f.startsWith('world_custom_'))
        .map(f => `/images/backgrounds/${f}`);
      backgrounds.push(...localBackgrounds);
    }
    
    // On Vercel, also fetch from Blob storage (for runtime-generated backgrounds)
    if (isVercel) {
      try {
        const { blobs } = await list({ prefix: 'images/backgrounds/world_custom_' });
        const blobBackgrounds = blobs.map(blob => blob.url);
        backgrounds.push(...blobBackgrounds);
      } catch (blobError) {
        console.error('Error fetching blob backgrounds:', blobError);
      }
    }
    
    // Sort by newest first (reverse alphabetical works for timestamp-based names)
    backgrounds.sort().reverse();
    
    return NextResponse.json({ backgrounds });
  } catch (error) {
    console.error('Failed to list backgrounds:', error);
    return NextResponse.json({ backgrounds: [] });
  }
}
