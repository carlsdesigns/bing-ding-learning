import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { 
  IMAGE_STYLE, 
  DALLE_CONFIG, 
  LETTER_CONFIG, 
  NUMBER_CONFIG 
} from './image-config';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'images', 'generated');
const LETTERS_DIR = path.join(OUTPUT_DIR, 'alphabet');
const NUMBERS_DIR = path.join(OUTPUT_DIR, 'numbers');

async function downloadImage(url: string, filepath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

async function generateImage(prompt: string, filename: string, outputDir: string): Promise<string> {
  const filepath = path.join(outputDir, filename);
  
  if (fs.existsSync(filepath)) {
    console.log(`  ⏭️  Skipping ${filename} (already exists)`);
    return filepath;
  }

  console.log(`  🎨 Generating: ${filename}...`);
  
  try {
    const response = await openai.images.generate({
      model: DALLE_CONFIG.model,
      prompt: `${prompt}, ${IMAGE_STYLE}`,
      n: 1,
      size: DALLE_CONFIG.size,
      quality: DALLE_CONFIG.quality,
    });

    const imageUrl = response.data[0]?.url;
    if (!imageUrl) {
      throw new Error('No image URL returned');
    }

    await downloadImage(imageUrl, filepath);
    console.log(`  ✅ Saved: ${filename}`);
    
    // Rate limit: wait between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return filepath;
  } catch (error) {
    console.error(`  ❌ Failed: ${filename}`, error);
    throw error;
  }
}

async function generateLetterImages(): Promise<void> {
  console.log('\n📚 Generating alphabet images...\n');
  
  if (!fs.existsSync(LETTERS_DIR)) {
    fs.mkdirSync(LETTERS_DIR, { recursive: true });
  }

  for (const [letter, config] of Object.entries(LETTER_CONFIG)) {
    await generateImage(config.prompt, `${letter.toLowerCase()}.png`, LETTERS_DIR);
  }
}

async function generateNumberImages(): Promise<void> {
  console.log('\n🔢 Generating number images...\n');
  
  if (!fs.existsSync(NUMBERS_DIR)) {
    fs.mkdirSync(NUMBERS_DIR, { recursive: true });
  }

  for (const [number, config] of Object.entries(NUMBER_CONFIG)) {
    await generateImage(config.prompt, `${number}.png`, NUMBERS_DIR);
  }
}

async function generateManifest(): Promise<void> {
  const manifest = {
    generatedAt: new Date().toISOString(),
    style: IMAGE_STYLE,
    letters: Object.entries(LETTER_CONFIG).map(([letter, config]) => ({
      letter,
      word: config.word,
      prompt: config.prompt,
      image: `/images/generated/alphabet/${letter.toLowerCase()}.png`,
    })),
    numbers: Object.entries(NUMBER_CONFIG).map(([number, config]) => ({
      number,
      description: config.description,
      prompt: config.prompt,
      image: `/images/generated/numbers/${number}.png`,
    })),
  };

  const manifestPath = path.join(OUTPUT_DIR, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('\n📄 Manifest saved to public/images/generated/manifest.json');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const generateLetters = args.includes('--letters') || args.includes('--all') || args.length === 0;
  const generateNumbers = args.includes('--numbers') || args.includes('--all') || args.length === 0;
  const single = args.find(a => a.startsWith('--single='));

  console.log('🖼️  Bing Ding Learning - Image Generator\n');
  console.log('=========================================');

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY environment variable is required');
    console.log('\nRun with: OPENAI_API_KEY=your-key npx tsx scripts/generate-images.ts');
    process.exit(1);
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  if (single) {
    const item = single.split('=')[1].toUpperCase();
    if (LETTER_CONFIG[item]) {
      if (!fs.existsSync(LETTERS_DIR)) {
        fs.mkdirSync(LETTERS_DIR, { recursive: true });
      }
      await generateImage(LETTER_CONFIG[item].prompt, `${item.toLowerCase()}.png`, LETTERS_DIR);
    } else if (NUMBER_CONFIG[item]) {
      if (!fs.existsSync(NUMBERS_DIR)) {
        fs.mkdirSync(NUMBERS_DIR, { recursive: true });
      }
      await generateImage(NUMBER_CONFIG[item].prompt, `${item}.png`, NUMBERS_DIR);
    } else {
      console.error(`❌ Unknown item: ${item}`);
      process.exit(1);
    }
  } else {
    if (generateLetters) await generateLetterImages();
    if (generateNumbers) await generateNumberImages();
  }

  await generateManifest();

  console.log('\n✨ Done!\n');
  console.log('Images saved to: public/generated/');
  console.log('Use in app with: /generated/letters/a.png, /generated/numbers/1.png');
}

main().catch(console.error);
