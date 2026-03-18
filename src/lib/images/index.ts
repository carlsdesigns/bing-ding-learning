import * as fs from 'fs';
import * as path from 'path';

export interface LetterImage {
  letter: string;
  word: string;
  image: string;
}

export interface NumberImage {
  number: string;
  description: string;
  image: string;
}

export interface ImageManifest {
  generatedAt: string;
  letters: LetterImage[];
  numbers: NumberImage[];
}

const LETTER_WORDS: Record<string, string> = {
  A: 'Apple', B: 'Bear', C: 'Cat', D: 'Dog', E: 'Elephant',
  F: 'Fish', G: 'Giraffe', H: 'Hat', I: 'Ice cream', J: 'Jellyfish',
  K: 'Kite', L: 'Lion', M: 'Moon', N: 'Nest', O: 'Owl',
  P: 'Penguin', Q: 'Queen', R: 'Rainbow', S: 'Sun', T: 'Tiger',
  U: 'Umbrella', V: 'Violin', W: 'Whale', X: 'Xylophone', Y: 'Yacht', Z: 'Zebra',
};

const NUMBER_DESCRIPTIONS: Record<string, string> = {
  '0': 'Zero', '1': 'One balloon', '2': 'Two kittens', '3': 'Three butterflies',
  '4': 'Four apples', '5': 'Five ducks', '6': 'Six crayons',
  '7': 'Seven stars', '8': 'Eight bees', '9': 'Nine balls',
};

function getSelectedOrLatestImage(type: 'letter' | 'number', item: string): string | undefined {
  const baseDir = type === 'letter' ? 'alphabet' : 'numbers';
  const itemDir = path.join(process.cwd(), 'public', 'images', 'generated', baseDir, item.toLowerCase());
  
  // Check if running in browser (client-side)
  if (typeof window !== 'undefined') {
    // Client-side: return the expected path format
    return `/images/generated/${baseDir}/${item.toLowerCase()}/`;
  }
  
  // Server-side: check filesystem
  if (!fs.existsSync(itemDir)) {
    return undefined;
  }

  // Check for selected image
  const selectionFile = path.join(itemDir, '.selected');
  if (fs.existsSync(selectionFile)) {
    return fs.readFileSync(selectionFile, 'utf-8').trim();
  }

  // Get most recent image
  const files = fs.readdirSync(itemDir)
    .filter(f => f.endsWith('.png'))
    .map(f => ({
      name: f,
      path: `/images/generated/${baseDir}/${item.toLowerCase()}/${f}`,
      time: fs.statSync(path.join(itemDir, f)).mtimeMs,
    }))
    .sort((a, b) => b.time - a.time);

  return files[0]?.path;
}

export function getLetterImage(letter: string): LetterImage | undefined {
  const upperLetter = letter.toUpperCase();
  const word = LETTER_WORDS[upperLetter];
  
  if (!word) return undefined;

  const image = getSelectedOrLatestImage('letter', upperLetter);
  
  return {
    letter: upperLetter,
    word,
    image: image || `/images/generated/alphabet/${letter.toLowerCase()}/`,
  };
}

export function getNumberImage(number: string | number): NumberImage | undefined {
  const numStr = String(number);
  const description = NUMBER_DESCRIPTIONS[numStr];
  
  if (!description) return undefined;

  const image = getSelectedOrLatestImage('number', numStr);
  
  return {
    number: numStr,
    description,
    image: image || `/images/generated/numbers/${numStr}/`,
  };
}

export function getAllLetterImages(): LetterImage[] {
  return Object.keys(LETTER_WORDS).map(letter => getLetterImage(letter)!);
}

export function getAllNumberImages(): NumberImage[] {
  return Object.keys(NUMBER_DESCRIPTIONS).map(num => getNumberImage(num)!);
}

export function getAvailableImages(type: 'letter' | 'number', item: string): string[] {
  const baseDir = type === 'letter' ? 'alphabet' : 'numbers';
  const itemDir = path.join(process.cwd(), 'public', 'images', 'generated', baseDir, item.toLowerCase());
  
  if (typeof window !== 'undefined' || !fs.existsSync(itemDir)) {
    return [];
  }

  return fs.readdirSync(itemDir)
    .filter(f => f.endsWith('.png'))
    .map(f => `/images/generated/${baseDir}/${item.toLowerCase()}/${f}`);
}
