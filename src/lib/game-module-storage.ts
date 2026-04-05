const ALPHABET_KEY = 'bingding-game-alphabet-mode';
const NUMBERS_KEY = 'bingding-game-numbers-mode';

export type AlphabetGameMode = 'recognition' | 'phonics' | 'pictures';
export type NumbersGameMode = 'numeral' | 'pictures';

export function readAlphabetMode(): AlphabetGameMode {
  if (typeof window === 'undefined') return 'recognition';
  const v = localStorage.getItem(ALPHABET_KEY);
  if (v === 'phonics' || v === 'pictures' || v === 'recognition') return v;
  return 'recognition';
}

export function writeAlphabetMode(mode: AlphabetGameMode): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ALPHABET_KEY, mode);
}

export function readNumbersMode(): NumbersGameMode {
  if (typeof window === 'undefined') return 'numeral';
  const v = localStorage.getItem(NUMBERS_KEY);
  if (v === 'pictures' || v === 'numeral') return v;
  return 'numeral';
}

export function writeNumbersMode(mode: NumbersGameMode): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(NUMBERS_KEY, mode);
}
