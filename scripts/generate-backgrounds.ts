/**
 * Generate World Backgrounds for Playground
 * 
 * Uses Google Imagen (same as letter/number images)
 * Run with: npm run generate:backgrounds
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { BACKGROUND_STYLE, BACKGROUND_CONFIG } from './image-config';

dotenv.config();

const BACKGROUNDS_DIR = path.join(process.cwd(), 'public', 'images', 'backgrounds');

async function generateBackgroundWithGoogle(prompt: string, filepath: string): Promise<void> {
  const fullPrompt = `${prompt}, ${BACKGROUND_STYLE}`;
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${process.env.GOOGLE_AI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances: [{ prompt: fullPrompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: '16:9', // Wide aspect ratio for backgrounds
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const predictions = data.predictions;
  
  if (!predictions || predictions.length === 0) {
    throw new Error('No predictions in response');
  }

  const imageData = predictions[0].bytesBase64Encoded;
  if (!imageData) {
    throw new Error('No image bytes in response');
  }

  const imageBuffer = Buffer.from(imageData, 'base64');
  fs.writeFileSync(filepath, imageBuffer);
}

async function generateBackground(id: string, config: { name: string; prompt: string }): Promise<void> {
  const filename = `world_${id}.jpg`;
  const filepath = path.join(BACKGROUNDS_DIR, filename);
  
  if (fs.existsSync(filepath)) {
    console.log(`  ⏭️  Skipping ${config.name} (already exists)`);
    return;
  }

  console.log(`  🎨 Generating: ${config.name}...`);
  
  try {
    await generateBackgroundWithGoogle(config.prompt, filepath);
    console.log(`  ✅ Saved: ${filename}`);
    
    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 2000));
  } catch (error) {
    console.error(`  ❌ Failed: ${config.name}`, error);
  }
}

async function main() {
  console.log('🌍 Bing Ding Learning - Background Generator\n');
  console.log('=============================================\n');

  if (!process.env.GOOGLE_AI_API_KEY) {
    console.error('❌ GOOGLE_AI_API_KEY environment variable is required');
    process.exit(1);
  }

  if (!fs.existsSync(BACKGROUNDS_DIR)) {
    fs.mkdirSync(BACKGROUNDS_DIR, { recursive: true });
  }

  const args = process.argv.slice(2);
  const singleArg = args.find(a => a.startsWith('--single='));

  if (singleArg) {
    const id = singleArg.split('=')[1];
    const config = BACKGROUND_CONFIG[id];
    if (!config) {
      console.error(`❌ Unknown background: ${id}`);
      console.log('Available backgrounds:', Object.keys(BACKGROUND_CONFIG).join(', '));
      process.exit(1);
    }
    await generateBackground(id, config);
  } else {
    console.log('Generating all world backgrounds...\n');
    for (const [id, config] of Object.entries(BACKGROUND_CONFIG)) {
      await generateBackground(id, config);
    }
  }

  console.log('\n✨ Done!');
  console.log('Backgrounds saved to: public/images/backgrounds/');
}

main().catch(console.error);
