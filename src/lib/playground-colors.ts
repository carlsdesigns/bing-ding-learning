/** Drawing colors shown in the playground picker + names for TTS. */
export const PLAYGROUND_DRAW_COLOR_SWATCHES = [
  { color: '#EF4444', name: 'Red', emoji: '🔴' },
  { color: '#F97316', name: 'Orange', emoji: '🟠' },
  { color: '#EAB308', name: 'Yellow', emoji: '🟡' },
  { color: '#22C55E', name: 'Green', emoji: '🟢' },
  { color: '#3B82F6', name: 'Blue', emoji: '🔵' },
  { color: '#8B5CF6', name: 'Purple', emoji: '🟣' },
  { color: '#EC4899', name: 'Pink', emoji: '💗' },
  { color: '#171717', name: 'Black', emoji: '⚫' },
] as const;

const EXTRA_HEX_NAMES: Record<string, string> = {
  '#78716c': 'Brown',
};

export function getPlaygroundColorName(hex: string): string {
  const key = hex.trim().toLowerCase();
  const fromSwatch = PLAYGROUND_DRAW_COLOR_SWATCHES.find(
    (s) => s.color.toLowerCase() === key
  );
  if (fromSwatch) return fromSwatch.name;
  return EXTRA_HEX_NAMES[key] ?? 'your color';
}
