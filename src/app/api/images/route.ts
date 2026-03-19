import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

const ALPHABET_DIR = path.join(process.cwd(), 'public', 'images', 'generated', 'alphabet');
const NUMBERS_DIR = path.join(process.cwd(), 'public', 'images', 'generated', 'numbers');
const BACKGROUNDS_DIR = path.join(process.cwd(), 'public', 'images', 'backgrounds');

interface ImageInfo {
  filename: string;
  path: string;
  createdAt: number;
  selected?: boolean;
}

interface ItemImages {
  item: string;
  type: 'letter' | 'number' | 'background';
  word?: string;
  description?: string;
  images: ImageInfo[];
  selectedImage?: string;
}

const BACKGROUND_IDS = ['undersea', 'land', 'schoolyard', 'clouds', 'stars', 'frozen', 'desert'];

function getImagesForItem(type: 'letter' | 'number' | 'background', item: string): ImageInfo[] {
  if (type === 'background') {
    return getBackgroundImages(item);
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

function getBackgroundImages(id: string): ImageInfo[] {
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

function getSelectedImage(type: 'letter' | 'number' | 'background', item: string): string | undefined {
  if (type === 'background') {
    const selectionFile = path.join(BACKGROUNDS_DIR, `.selected_${item}`);
    if (fs.existsSync(selectionFile)) {
      return fs.readFileSync(selectionFile, 'utf-8').trim();
    }
    const images = getBackgroundImages(item);
    return images[0]?.path;
  }
  
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
  const type = searchParams.get('type') as 'letter' | 'number' | 'background' | null;
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

  const backgrounds = BACKGROUND_IDS.map(id => ({
    item: id,
    type: 'background' as const,
    images: getBackgroundImages(id),
    selectedImage: getSelectedImage('background', id),
  }));

  return NextResponse.json({ letters, numbers, backgrounds });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { type, item, selectedImage } = body;

  if (!type || !item || !selectedImage) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

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

  // Security: ensure path is within allowed directories
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
