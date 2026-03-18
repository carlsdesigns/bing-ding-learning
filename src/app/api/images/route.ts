import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

const ALPHABET_DIR = path.join(process.cwd(), 'public', 'images', 'generated', 'alphabet');
const NUMBERS_DIR = path.join(process.cwd(), 'public', 'images', 'generated', 'numbers');

interface ImageInfo {
  filename: string;
  path: string;
  createdAt: number;
  selected?: boolean;
}

interface ItemImages {
  item: string;
  type: 'letter' | 'number';
  word?: string;
  description?: string;
  images: ImageInfo[];
  selectedImage?: string;
}

function getImagesForItem(type: 'letter' | 'number', item: string): ImageInfo[] {
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

function getSelectedImage(type: 'letter' | 'number', item: string): string | undefined {
  const baseDir = type === 'letter' ? ALPHABET_DIR : NUMBERS_DIR;
  const selectionFile = path.join(baseDir, item.toLowerCase(), '.selected');
  
  if (fs.existsSync(selectionFile)) {
    return fs.readFileSync(selectionFile, 'utf-8').trim();
  }
  
  // Default to most recent image
  const images = getImagesForItem(type, item);
  return images[0]?.path;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') as 'letter' | 'number' | null;
  const item = searchParams.get('item');

  if (item && type) {
    // Get images for specific item
    const images = getImagesForItem(type, item);
    const selected = getSelectedImage(type, item);
    
    return NextResponse.json({
      item,
      type,
      images,
      selectedImage: selected,
    });
  }

  // Get all items
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => ({
    item: letter,
    type: 'letter' as const,
    images: getImagesForItem('letter', letter),
    selectedImage: getSelectedImage('letter', letter),
  }));

  const numbers = '0123456789'.split('').map(num => ({
    item: num,
    type: 'number' as const,
    images: getImagesForItem('number', num),
    selectedImage: getSelectedImage('number', num),
  }));

  return NextResponse.json({ letters, numbers });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { type, item, selectedImage } = body;

  if (!type || !item || !selectedImage) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const baseDir = type === 'letter' ? ALPHABET_DIR : NUMBERS_DIR;
  const selectionFile = path.join(baseDir, item.toLowerCase(), '.selected');
  
  // Create directory if needed
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

  // Security: ensure path is within generated images
  if (!imagePath.startsWith('/images/generated/')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const fullPath = path.join(process.cwd(), 'public', imagePath);
  
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'File not found' }, { status: 404 });
}
