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

export const LETTER_IMAGES: Record<string, LetterImage> = {
  A: { letter: 'A', word: 'Apple', image: '/images/generated/alphabet/a.png' },
  B: { letter: 'B', word: 'Bear', image: '/images/generated/alphabet/b.png' },
  C: { letter: 'C', word: 'Cat', image: '/images/generated/alphabet/c.png' },
  D: { letter: 'D', word: 'Dog', image: '/images/generated/alphabet/d.png' },
  E: { letter: 'E', word: 'Elephant', image: '/images/generated/alphabet/e.png' },
  F: { letter: 'F', word: 'Fish', image: '/images/generated/alphabet/f.png' },
  G: { letter: 'G', word: 'Giraffe', image: '/images/generated/alphabet/g.png' },
  H: { letter: 'H', word: 'Hat', image: '/images/generated/alphabet/h.png' },
  I: { letter: 'I', word: 'Ice cream', image: '/images/generated/alphabet/i.png' },
  J: { letter: 'J', word: 'Jellyfish', image: '/images/generated/alphabet/j.png' },
  K: { letter: 'K', word: 'Kite', image: '/images/generated/alphabet/k.png' },
  L: { letter: 'L', word: 'Lion', image: '/images/generated/alphabet/l.png' },
  M: { letter: 'M', word: 'Moon', image: '/images/generated/alphabet/m.png' },
  N: { letter: 'N', word: 'Nest', image: '/images/generated/alphabet/n.png' },
  O: { letter: 'O', word: 'Owl', image: '/images/generated/alphabet/o.png' },
  P: { letter: 'P', word: 'Penguin', image: '/images/generated/alphabet/p.png' },
  Q: { letter: 'Q', word: 'Queen', image: '/images/generated/alphabet/q.png' },
  R: { letter: 'R', word: 'Rainbow', image: '/images/generated/alphabet/r.png' },
  S: { letter: 'S', word: 'Sun', image: '/images/generated/alphabet/s.png' },
  T: { letter: 'T', word: 'Tiger', image: '/images/generated/alphabet/t.png' },
  U: { letter: 'U', word: 'Umbrella', image: '/images/generated/alphabet/u.png' },
  V: { letter: 'V', word: 'Violin', image: '/images/generated/alphabet/v.png' },
  W: { letter: 'W', word: 'Whale', image: '/images/generated/alphabet/w.png' },
  X: { letter: 'X', word: 'Xylophone', image: '/images/generated/alphabet/x.png' },
  Y: { letter: 'Y', word: 'Yacht', image: '/images/generated/alphabet/y.png' },
  Z: { letter: 'Z', word: 'Zebra', image: '/images/generated/alphabet/z.png' },
};

export const NUMBER_IMAGES: Record<string, NumberImage> = {
  '0': { number: '0', description: 'Zero', image: '/images/generated/numbers/0.png' },
  '1': { number: '1', description: 'One balloon', image: '/images/generated/numbers/1.png' },
  '2': { number: '2', description: 'Two kittens', image: '/images/generated/numbers/2.png' },
  '3': { number: '3', description: 'Three butterflies', image: '/images/generated/numbers/3.png' },
  '4': { number: '4', description: 'Four apples', image: '/images/generated/numbers/4.png' },
  '5': { number: '5', description: 'Five ducks', image: '/images/generated/numbers/5.png' },
  '6': { number: '6', description: 'Six crayons', image: '/images/generated/numbers/6.png' },
  '7': { number: '7', description: 'Seven stars', image: '/images/generated/numbers/7.png' },
  '8': { number: '8', description: 'Eight bees', image: '/images/generated/numbers/8.png' },
  '9': { number: '9', description: 'Nine balls', image: '/images/generated/numbers/9.png' },
};

export function getLetterImage(letter: string): LetterImage | undefined {
  return LETTER_IMAGES[letter.toUpperCase()];
}

export function getNumberImage(number: string | number): NumberImage | undefined {
  return NUMBER_IMAGES[String(number)];
}

export function getAllLetterImages(): LetterImage[] {
  return Object.values(LETTER_IMAGES);
}

export function getAllNumberImages(): NumberImage[] {
  return Object.values(NUMBER_IMAGES);
}
