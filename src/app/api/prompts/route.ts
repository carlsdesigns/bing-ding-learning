import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'scripts', 'image-config.ts');

interface LetterConfig {
  word: string;
  prompt: string;
}

interface NumberConfig {
  description: string;
  prompt: string;
}

interface BackgroundConfig {
  name: string;
  prompt: string;
}

function parseConfig(): { 
  letters: Record<string, LetterConfig>; 
  numbers: Record<string, NumberConfig>;
  backgrounds: Record<string, BackgroundConfig>;
} {
  const content = fs.readFileSync(CONFIG_PATH, 'utf-8');
  
  const letters: Record<string, LetterConfig> = {};
  const numbers: Record<string, NumberConfig> = {};
  const backgrounds: Record<string, BackgroundConfig> = {};
  
  // Parse letters (A-Z)
  const letterRegex = /([A-Z]):\s*\{\s*word:\s*'([^']*)'\s*,\s*prompt:\s*'([^']*)'\s*\}/g;
  let match;
  while ((match = letterRegex.exec(content)) !== null) {
    letters[match[1]] = {
      word: match[2],
      prompt: match[3],
    };
  }
  
  // Parse numbers (0-9)
  const numberRegex = /'(\d)':\s*\{\s*description:\s*'([^']*)'\s*,\s*prompt:\s*'([^']*)'\s*\}/g;
  while ((match = numberRegex.exec(content)) !== null) {
    numbers[match[1]] = {
      description: match[2],
      prompt: match[3],
    };
  }
  
  // Parse backgrounds
  const backgroundRegex = /'([a-z]+)':\s*\{\s*name:\s*'([^']*)'\s*,\s*prompt:\s*'([^']*)'\s*,?\s*\}/g;
  // Only look in the BACKGROUND_CONFIG section
  const backgroundSection = content.match(/BACKGROUND_CONFIG[\s\S]*?= \{([\s\S]*?)\};/);
  if (backgroundSection) {
    while ((match = backgroundRegex.exec(backgroundSection[1])) !== null) {
      backgrounds[match[1]] = {
        name: match[2],
        prompt: match[3],
      };
    }
  }
  
  console.log('[Prompts API] Parsed letters:', Object.keys(letters).length);
  console.log('[Prompts API] Parsed numbers:', Object.keys(numbers).length);
  console.log('[Prompts API] Parsed backgrounds:', Object.keys(backgrounds).length);
  
  return { letters, numbers, backgrounds };
}

function updateConfig(type: 'letter' | 'number' | 'background', item: string, prompt: string): void {
  let content = fs.readFileSync(CONFIG_PATH, 'utf-8');
  
  if (type === 'letter') {
    const letter = item.toUpperCase();
    // Match the specific letter's prompt
    const regex = new RegExp(
      `(${letter}:\\s*\\{[^}]*prompt:\\s*)'([^']*)'`,
      's'
    );
    content = content.replace(regex, `$1'${prompt.replace(/'/g, "\\'")}'`);
  } else if (type === 'background') {
    // Match the specific background's prompt
    const regex = new RegExp(
      `('${item}':\\s*\\{\\s*name:\\s*'[^']*'\\s*,\\s*prompt:\\s*)'([^']*)'`,
      's'
    );
    content = content.replace(regex, `$1'${prompt.replace(/'/g, "\\'")}'`);
  } else {
    // Match the specific number's prompt
    const regex = new RegExp(
      `('${item}':\\s*\\{[^}]*prompt:\\s*)'([^']*)'`,
      's'
    );
    content = content.replace(regex, `$1'${prompt.replace(/'/g, "\\'")}'`);
  }
  
  fs.writeFileSync(CONFIG_PATH, content);
}

export async function GET() {
  try {
    const config = parseConfig();
    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to read config' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { type, item, prompt } = await request.json();
    
    if (!type || !item || !prompt) {
      return NextResponse.json(
        { error: 'Missing type, item, or prompt' },
        { status: 400 }
      );
    }
    
    updateConfig(type, item, prompt);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating config:', error);
    return NextResponse.json(
      { error: 'Failed to update config' },
      { status: 500 }
    );
  }
}
