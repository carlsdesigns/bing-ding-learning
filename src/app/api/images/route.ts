import { NextRequest, NextResponse } from 'next/server';
import { list, del } from '@vercel/blob';
import * as fs from 'fs';
import * as path from 'path';

// Check if we're on Vercel (use Blob storage) or local (use filesystem)
const isVercel = process.env.VERCEL === '1';

const ALPHABET_DIR = path.join(process.cwd(), 'public', 'images', 'generated', 'alphabet');
const NUMBERS_DIR = path.join(process.cwd(), 'public', 'images', 'generated', 'numbers');
const BACKGROUNDS_DIR = path.join(process.cwd(), 'public', 'images', 'backgrounds');

interface ImageInfo {
  filename: string;
  path: string;
  createdAt: number;
  selected?: boolean;
}

const BACKGROUND_IDS = ['undersea', 'land', 'schoolyard', 'clouds', 'stars', 'frozen', 'desert'];

// ============ Local filesystem functions ============

function getLocalImagesForItem(type: 'letter' | 'number' | 'background', item: string): ImageInfo[] {
  if (type === 'background') {
    return getLocalBackgroundImages(item);
  }
  
  const baseDir = type === 'letter' ? ALPHABET_DIR : NUMBERS_DIR;
  const itemDir = path.join(baseDir, item.toLowerCase());
  
  if (!fs.existsSync(itemDir)) {
    return [];
  }

  const files = fs.readdirSync(itemDir).filter(f => f.endsWith('.png'));
  
  return files.map(filename => {
    const filepath = path.join(itemDir, filename);
    const stats = fs.statSync(filepath);
    const publicPath = `/images/generated/${type === 'letter' ? 'alphabet' : 'numbers'}/${item.toLowerCase()}/${filename}`;
    
    return {
      filename,
      path: publicPath,
      createdAt: stats.mtimeMs,
    };
  }).sort((a, b) => b.createdAt - a.createdAt);
}

function getLocalBackgroundImages(id: string): ImageInfo[] {
  if (!fs.existsSync(BACKGROUNDS_DIR)) {
    return [];
  }
  
  const files = fs.readdirSync(BACKGROUNDS_DIR).filter(f => 
    f.startsWith(`world_${id}`) && (f.endsWith('.jpg') || f.endsWith('.png'))
  );
  
  return files.map(filename => {
    const filepath = path.join(BACKGROUNDS_DIR, filename);
    const stats = fs.statSync(filepath);
    const publicPath = `/images/backgrounds/${filename}`;
    
    return {
      filename,
      path: publicPath,
      createdAt: stats.mtimeMs,
    };
  }).sort((a, b) => b.createdAt - a.createdAt);
}

function getLocalSelectedImage(type: 'letter' | 'number' | 'background', item: string): string | undefined {
  if (type === 'background') {
    const selectionFile = path.join(BACKGROUNDS_DIR, `.selected_${item}`);
    if (fs.existsSync(selectionFile)) {
      return fs.readFileSync(selectionFile, 'utf-8').trim();
    }
    const images = getLocalBackgroundImages(item);
    return images[0]?.path;
  }
  
  const baseDir = type === 'letter' ? ALPHABET_DIR : NUMBERS_DIR;
  const selectionFile = path.join(baseDir, item.toLowerCase(), '.selected');
  
  if (fs.existsSync(selectionFile)) {
    return fs.readFileSync(selectionFile, 'utf-8').trim();
  }
  
  const images = getLocalImagesForItem(type, item);
  return images[0]?.path;
}

// ============ Vercel Blob functions ============

async function getBlobImagesForItem(type: 'letter' | 'number' | 'background', item: string): Promise<ImageInfo[]> {
  try {
    let prefix: string;
    
    if (type === 'background') {
      prefix = `images/backgrounds/world_${item}`;
    } else {
      const folder = type === 'letter' ? 'alphabet' : 'numbers';
      prefix = `images/generated/${folder}/${item.toLowerCase()}/`;
    }
    
    const { blobs } = await list({ prefix });
    
    return blobs.map(blob => ({
      filename: blob.pathname.split('/').pop() || '',
      path: blob.url,
      createdAt: new Date(blob.uploadedAt).getTime(),
    })).sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error(`[Blob] Error listing images for ${type}/${item}:`, error);
    return [];
  }
}

async function getBlobSelectedImage(type: 'letter' | 'number' | 'background', item: string): Promise<string | undefined> {
  // For blob storage, just return the most recent image
  const images = await getBlobImagesForItem(type, item);
  return images[0]?.path;
}

// ============ Unified API handlers ============

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') as 'letter' | 'number' | 'background' | null;
  const item = searchParams.get('item');

  if (item && type) {
    // Get images for specific item
    const images = isVercel 
      ? await getBlobImagesForItem(type, item)
      : getLocalImagesForItem(type, item);
    const selected = isVercel
      ? await getBlobSelectedImage(type, item)
      : getLocalSelectedImage(type, item);
    
    return NextResponse.json({
      item,
      type,
      images,
      selectedImage: selected,
    });
  }

  // Get all items
  if (isVercel) {
    // On Vercel, fetch from blob storage
    const lettersPromises = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(async letter => ({
      item: letter,
      type: 'letter' as const,
      images: await getBlobImagesForItem('letter', letter),
      selectedImage: await getBlobSelectedImage('letter', letter),
    }));

    const numbersPromises = '0123456789'.split('').map(async num => ({
      item: num,
      type: 'number' as const,
      images: await getBlobImagesForItem('number', num),
      selectedImage: await getBlobSelectedImage('number', num),
    }));

    const backgroundsPromises = BACKGROUND_IDS.map(async id => ({
      item: id,
      type: 'background' as const,
      images: await getBlobImagesForItem('background', id),
      selectedImage: await getBlobSelectedImage('background', id),
    }));

    const [letters, numbers, backgrounds] = await Promise.all([
      Promise.all(lettersPromises),
      Promise.all(numbersPromises),
      Promise.all(backgroundsPromises),
    ]);

    return NextResponse.json({ letters, numbers, backgrounds });
  } else {
    // Local filesystem
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => ({
      item: letter,
      type: 'letter' as const,
      images: getLocalImagesForItem('letter', letter),
      selectedImage: getLocalSelectedImage('letter', letter),
    }));

    const numbers = '0123456789'.split('').map(num => ({
      item: num,
      type: 'number' as const,
      images: getLocalImagesForItem('number', num),
      selectedImage: getLocalSelectedImage('number', num),
    }));

    const backgrounds = BACKGROUND_IDS.map(id => ({
      item: id,
      type: 'background' as const,
      images: getLocalBackgroundImages(id),
      selectedImage: getLocalSelectedImage('background', id),
    }));

    return NextResponse.json({ letters, numbers, backgrounds });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { type, item, selectedImage } = body;

  if (!type || !item || !selectedImage) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (isVercel) {
    // On Vercel, selection is just tracked by most recent - no persistence needed
    // Could store in a KV store or database if needed
    return NextResponse.json({ success: true, selectedImage });
  }

  // Local filesystem
  if (type === 'background') {
    if (!fs.existsSync(BACKGROUNDS_DIR)) {
      fs.mkdirSync(BACKGROUNDS_DIR, { recursive: true });
    }
    const selectionFile = path.join(BACKGROUNDS_DIR, `.selected_${item}`);
    fs.writeFileSync(selectionFile, selectedImage);
    return NextResponse.json({ success: true, selectedImage });
  }

  const baseDir = type === 'letter' ? ALPHABET_DIR : NUMBERS_DIR;
  const selectionFile = path.join(baseDir, item.toLowerCase(), '.selected');
  
  const itemDir = path.join(baseDir, item.toLowerCase());
  if (!fs.existsSync(itemDir)) {
    fs.mkdirSync(itemDir, { recursive: true });
  }

  fs.writeFileSync(selectionFile, selectedImage);

  return NextResponse.json({ success: true, selectedImage });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imagePath = searchParams.get('path');

  if (!imagePath) {
    return NextResponse.json({ error: 'Missing path' }, { status: 400 });
  }

  if (isVercel) {
    // Delete from Blob storage
    try {
      await del(imagePath);
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('[Blob] Delete error:', error);
      return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
  }

  // Local filesystem
  if (!imagePath.startsWith('/images/generated/') && !imagePath.startsWith('/images/backgrounds/')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const fullPath = path.join(process.cwd(), 'public', imagePath);
  
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'File not found' }, { status: 404 });
}
