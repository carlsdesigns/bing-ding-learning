import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';
import * as fs from 'fs';
import * as path from 'path';

const isVercel = process.env.VERCEL === '1';
const hasBlobToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
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
    
    // User-generated worlds in Blob (Vercel production, or local/preview when token is set)
    if (isVercel || hasBlobToken) {
      try {
        const blobUrls: string[] = [];
        let cursor: string | undefined;
        for (;;) {
          const { blobs, hasMore, cursor: nextCursor } = await list({
            prefix: 'images/backgrounds/world_custom_',
            limit: 1000,
            cursor,
          });
          blobUrls.push(...blobs.map((b) => b.url));
          if (!hasMore) break;
          cursor = nextCursor;
          if (!cursor) break;
        }
        backgrounds.push(...blobUrls);
      } catch (blobError) {
        console.error('Error fetching blob backgrounds:', blobError);
      }
    }
    
    const unique = Array.from(new Set(backgrounds));
    // Sort by newest first (reverse alphabetical works for timestamp-based local filenames)
    unique.sort().reverse();

    return NextResponse.json({ backgrounds: unique });
  } catch (error) {
    console.error('Failed to list backgrounds:', error);
    return NextResponse.json({ backgrounds: [] });
  }
}
