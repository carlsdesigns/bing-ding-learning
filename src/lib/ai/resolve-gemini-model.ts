/**
 * Model id for getGenerativeModel({ model }). Default matches current AI Studio listings.
 * Older env values map forward so Coach notes keep working after Google retires model ids.
 */
export function resolveGoogleGeminiModel(envValue: string | undefined): string {
  const raw = (envValue ?? '').trim();
  const id = raw || 'gemini-2.5-flash';
  const legacy: Record<string, string> = {
    'gemini-pro': 'gemini-2.5-flash',
    'gemini-pro-vision': 'gemini-2.5-flash',
    'gemini-1.5-flash': 'gemini-2.5-flash',
    'gemini-1.5-pro': 'gemini-2.5-flash',
  };
  return legacy[id] ?? id;
}
