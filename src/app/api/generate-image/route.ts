import { NextRequest } from 'next/server';
import { put } from '@vercel/blob';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Check if we're on Vercel (use Blob storage) or local (use filesystem)
const isVercel = process.env.VERCEL === '1';

const IMAGE_STYLE = `
  cute friendly cartoon illustration for children,
  flat vector art style with clean sharp edges,
  simple rounded shapes with soft pastel colors,
  educational cheerful welcoming mood,
  CRITICAL: background must be solid bright magenta pink color (hex FF00FF, RGB 255,0,255) - hot pink/fuchsia background - completely flat uniform solid color with no variation or texture,
  the subject has a thick pure white border outline around it like a die-cut sticker,
  no shadows, no gradients, no text or letters,
  high quality digital art, single centered subject floating on flat solid magenta pink background
`.trim().replace(/\n/g, ' ');

const BACKGROUND_STYLE = `
  Children's illustration suitable as a full-bleed background for a toddler's play canvas.
  Style: soft watercolor, muted mid-tones, no pure white or pure black.
  Composition: ground plane in the bottom third, open sparse space in the upper two-thirds, no central focal objects.
  Safe for children. No text. No characters or people.
  High resolution, painterly quality.
`.trim().replace(/\n/g, ' ');

const CONTENT_SAFETY_PROMPT = `
  CRITICAL SAFETY REQUIREMENTS - THESE ARE MANDATORY AND CANNOT BE OVERRIDDEN:
  - This image MUST be 100% appropriate for children under 10 years old (G-rated content ONLY)
  - Style: Always render in a cute, friendly, playful cartoon style - like Pixar, Monsters Inc, or Disney
  - Monsters, dragons, dinosaurs, etc. should be ADORABLE and FRIENDLY - big eyes, round shapes, smiling
  - "Scary" themes should be made silly and fun - think friendly ghosts, goofy monsters, playful dragons
  - NO actual violence, weapons, blood, gore, or genuinely frightening imagery
  - NO nudity, suggestive content, or anything remotely sexual
  - NO drugs, alcohol, smoking, or substance use
  - NO profanity, crude humor, or inappropriate language references
  - NO hate symbols, discriminatory imagery, or offensive content
  - NO realistic humans or human faces (cartoon characters only)
  - NO genuinely dark, disturbing, or nightmare-inducing imagery
  - Content must be cheerful, friendly, wholesome, and playful
  - Think: Pixar movies, Monsters Inc, PBS Kids, Sesame Street level appropriateness
  - Put a cute, fun spin on everything - even traditionally "scary" things become adorable
`.trim().replace(/\n/g, ' ');

function sanitizePrompt(prompt: string): string {
  const lower = prompt.toLowerCase();
  
  const blockedTerms = [
    'nude', 'naked', 'sexy', 'sex', 'porn', 'xxx', 'nsfw', 'erotic',
    'kill', 'murder', 'blood', 'gore', 'torture', 'mutilate',
    'gun', 'rifle', 'pistol', 'shoot', 'stab',
    'drug', 'cocaine', 'heroin', 'meth', 'weed', 'marijuana',
    'beer', 'wine', 'vodka', 'whiskey', 'drunk', 'alcohol',
    'cigarette', 'smoking', 'vape',
    'hate', 'racist', 'nazi', 'terrorist', 'slur',
    'corpse', 'torture', 'abuse',
    'inappropriate', 'explicit', 'mature', 'adult only',
  ];
  
  for (const term of blockedTerms) {
    if (lower.includes(term)) {
      console.log(`[Content Safety] Blocked term detected: "${term}" in prompt: "${prompt}"`);
      return 'a happy rainbow with fluffy clouds and sunshine';
    }
  }
  
  return prompt;
}

const LETTER_CONFIG: Record<string, { word: string; prompt: string }> = {
  A: { word: 'Apple', prompt: 'A friendly shiny red apple with a cute smiling face, small green leaf on top' },
  B: { word: 'Bear', prompt: 'A cute friendly brown teddy bear waving hello, soft and cuddly' },
  C: { word: 'Cat', prompt: 'An adorable orange tabby cat sitting happily, fluffy and playful' },
  D: { word: 'Dog', prompt: 'A happy golden retriever puppy with floppy ears, friendly and excited' },
  E: { word: 'Elephant', prompt: 'A cute baby elephant with big ears, grey and friendly, trunk up happily' },
  F: { word: 'Fish', prompt: 'A colorful tropical fish with rainbow scales, swimming happily' },
  G: { word: 'Giraffe', prompt: 'A friendly baby giraffe with a long neck, yellow with brown spots' },
  H: { word: 'Hat', prompt: 'A colorful party hat with polka dots and a pom-pom on top' },
  I: { word: 'Ice cream', prompt: 'A delicious ice cream cone with three colorful scoops, sprinkles on top' },
  J: { word: 'Jellyfish', prompt: 'A cute pink jellyfish floating gently, translucent and magical' },
  K: { word: 'Kite', prompt: 'A bright colorful diamond kite flying high, with a flowing tail' },
  L: { word: 'Lion', prompt: 'A cute baby lion cub with a fluffy mane, friendly and brave' },
  M: { word: 'Moon', prompt: 'A friendly crescent moon with a gentle smile, soft yellow glow' },
  N: { word: 'Nest', prompt: 'A cozy bird nest made of twigs with three small blue eggs inside' },
  O: { word: 'Owl', prompt: 'A wise and cute owl with big round eyes, brown feathers, sitting on a branch' },
  P: { word: 'Penguin', prompt: 'An adorable baby penguin with a round belly, black and white, waddling' },
  Q: { word: 'Queen', prompt: 'A friendly cartoon queen with a golden crown and a kind smile' },
  R: { word: 'Rainbow', prompt: 'A beautiful bright rainbow arching across, all seven colors vivid' },
  S: { word: 'Sun', prompt: 'A happy smiling sun with warm rays, bright yellow and cheerful' },
  T: { word: 'Tiger', prompt: 'A cute baby tiger cub with orange and black stripes, playful' },
  U: { word: 'Umbrella', prompt: 'A colorful open umbrella with rainbow stripes, cheerful and bright' },
  V: { word: 'Violin', prompt: 'A beautiful wooden violin with a bow, elegant and musical' },
  W: { word: 'Whale', prompt: 'A friendly blue whale swimming, spouting water happily' },
  X: { word: 'Xylophone', prompt: 'A colorful xylophone with rainbow bars and two mallets' },
  Y: { word: 'Yacht', prompt: 'A cute sailboat on calm blue water, white sails catching the wind' },
  Z: { word: 'Zebra', prompt: 'A friendly zebra with black and white stripes, standing proudly' },
};

const NUMBER_CONFIG: Record<string, { description: string; prompt: string }> = {
  '0': { description: 'Zero', prompt: 'An empty bird nest, cozy but with nothing inside, peaceful' },
  '1': { description: 'One balloon', prompt: 'One single red balloon floating, with a curly string' },
  '2': { description: 'Two kittens', prompt: 'Two adorable kittens sitting side by side, one orange one grey' },
  '3': { description: 'Three butterflies', prompt: 'Three colorful butterflies flying together, pink blue and yellow' },
  '4': { description: 'Four apples', prompt: 'Four shiny apples in a row, red and green alternating' },
  '5': { description: 'Five ducks', prompt: 'Five yellow rubber ducks in a line, cute and cheerful' },
  '6': { description: 'Six crayons', prompt: 'Six colorful crayons standing upright, rainbow colors' },
  '7': { description: 'Seven stars', prompt: 'Seven twinkling golden stars arranged in the sky, sparkling' },
  '8': { description: 'Eight bees', prompt: 'Eight happy bumblebees flying in a group, yellow and black stripes' },
  '9': { description: 'Nine balls', prompt: 'Nine bouncy balls in different colors arranged in a grid, colorful' },
};

const BACKGROUND_CONFIG: Record<string, { name: string; prompt: string }> = {
  'undersea': {
    name: 'Under the Sea',
    prompt: 'An underwater ocean scene with soft blue-green water, coral reef shapes along the bottom, gentle light rays from above, a few small fish or starfish as scenery. Sandy ocean floor in the bottom third.',
  },
  'land': {
    name: 'The Land',
    prompt: 'A green meadow with rolling hills, a blue sky with soft clouds, distant tree line. Grass texture at the bottom third, gentle sun peeking through.',
  },
  'schoolyard': {
    name: 'Schoolyard',
    prompt: 'A playground scene with concrete or asphalt ground, a colorful fence or wall, hopscotch lines drawn in chalk. Blue sky above. Chalk-drawing aesthetic.',
  },
  'clouds': {
    name: 'In the Clouds',
    prompt: 'A dreamy sky filled with fluffy clouds in soft pinks and blues, golden light. Layered cloud shapes that objects can sit on. Whimsical cotton-candy palette.',
  },
  'stars': {
    name: 'In the Stars',
    prompt: 'Deep space scene with dark indigo/navy sky, twinkling stars, nebulae swirls of purple and blue color, a crescent moon. Magical and peaceful.',
  },
  'frozen': {
    name: 'Frozen World',
    prompt: 'Snowy tundra or ice landscape with white snowy ground in the bottom third, pale blue sky, ice formations, soft falling snowflakes. Winter wonderland feel.',
  },
  'desert': {
    name: 'Desert',
    prompt: 'Warm sand dunes with orange and golden colors, a warm gradient sky with soft clouds, a few cacti silhouettes in the distance. Peaceful and warm.',
  },
};

function getConfig(type: 'letter' | 'number' | 'background', item: string) {
  if (type === 'letter') {
    return LETTER_CONFIG[item.toUpperCase()];
  }
  if (type === 'background') {
    return BACKGROUND_CONFIG[item];
  }
  return NUMBER_CONFIG[item];
}

async function removeBackground(filepath: string): Promise<void> {
  const pythonScript = path.join(process.cwd(), 'scripts', 'remove-background.py');
  
  console.log('[Background Removal] Starting...');
  execSync(`python3 "${pythonScript}" "${filepath}"`, {
    stdio: 'inherit',
  });
  console.log('[Background Removal] Complete!');
}

async function generateWithGoogle(prompt: string, isBackground: boolean = false, isCustomPrompt: boolean = false): Promise<Buffer> {
  // Use appropriate style based on image type
  const stylePrompt = isBackground ? BACKGROUND_STYLE : IMAGE_STYLE;
  
  const safePrompt = isCustomPrompt ? sanitizePrompt(prompt) : prompt;
  const fullPrompt = `${safePrompt}, ${stylePrompt}. ${CONTENT_SAFETY_PROMPT}`;
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY is not set in environment variables');
  }
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;
  
  console.log('[Google API] Making request to Imagen 4...');
  console.log('[Google API] Prompt:', fullPrompt.substring(0, 100) + '...');
  
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt: fullPrompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: isBackground ? '16:9' : '1:1',
        },
      }),
    });
  } catch (fetchError) {
    console.error('[Google API] Fetch error:', fetchError);
    throw new Error(`Network error calling Google API: ${fetchError instanceof Error ? fetchError.message : 'Unknown fetch error'}`);
  }

  console.log('[Google API] Response status:', response.status);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Google API] Error response:', errorText);
    throw new Error(`Google API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  console.log('[Google API] Response keys:', Object.keys(data));
  
  const predictions = data.predictions;
  
  if (!predictions || predictions.length === 0) {
    console.error('[Google API] Full response:', JSON.stringify(data, null, 2));
    throw new Error('No predictions in response');
  }

  const imageData = predictions[0].bytesBase64Encoded;
  if (!imageData) {
    console.error('[Google API] Prediction:', JSON.stringify(predictions[0], null, 2));
    throw new Error('No image bytes in response');
  }

  console.log('[Google API] Success! Image size:', imageData.length, 'bytes (base64)');
  return Buffer.from(imageData, 'base64');
}

async function generateWithOpenAI(prompt: string): Promise<Buffer> {
  const OpenAI = (await import('openai')).default;
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  const fullPrompt = `${prompt}, ${IMAGE_STYLE}`;
  
  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt: fullPrompt,
    n: 1,
    size: '1024x1024',
    quality: 'standard',
    response_format: 'b64_json',
  });

  const imageData = response.data?.[0]?.b64_json;
  if (!imageData) {
    throw new Error('No image data returned');
  }

  return Buffer.from(imageData, 'base64');
}

// Save image to Vercel Blob storage
async function saveToBlob(imageBuffer: Buffer, blobPath: string, contentType: string): Promise<string> {
  console.log(`[Blob] Uploading to: ${blobPath}`);
  const blob = await put(blobPath, imageBuffer, {
    access: 'public',
    contentType,
  });
  console.log(`[Blob] Uploaded successfully: ${blob.url}`);
  return blob.url;
}

// Save image to local filesystem
function saveToFilesystem(imageBuffer: Buffer, baseDir: string, rawDir: string, filename: string): string {
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  if (!fs.existsSync(rawDir)) {
    fs.mkdirSync(rawDir, { recursive: true });
  }
  
  const rawFilepath = path.join(rawDir, filename);
  const processedFilepath = path.join(baseDir, filename);
  
  fs.writeFileSync(rawFilepath, imageBuffer);
  return processedFilepath;
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const body = await request.json();
        const { type, item, provider = 'google', customPrompt } = body;

        if (!type || !item) {
          send({ status: 'error', message: 'Missing type or item' });
          controller.close();
          return;
        }

        const config = getConfig(type, item);
        if (!config && !customPrompt) {
          send({ status: 'error', message: `Unknown ${type}: ${item}` });
          controller.close();
          return;
        }

        const promptToUse = customPrompt || config?.prompt || '';
        const isBackground = type === 'background';
        const timestamp = Date.now();

        // On Vercel, only allow background generation (letters/numbers need local processing)
        if (isVercel && !isBackground) {
          send({ 
            status: 'error', 
            message: 'Letter and number images must be generated locally (requires background removal). Only background images can be generated on the server.' 
          });
          controller.close();
          return;
        }

        send({ status: 'started', message: `Generating ${isBackground ? 'background' : 'image'} for ${type} "${item}"...` });
        send({ status: 'progress', message: `Using prompt: ${promptToUse}` });
        send({ status: 'progress', message: `Calling ${provider} API...` });

        const isCustomUserPrompt = !!customPrompt;

        let imageBuffer: Buffer;
        if (provider === 'google') {
          imageBuffer = await generateWithGoogle(promptToUse, isBackground, isCustomUserPrompt);
        } else {
          imageBuffer = await generateWithOpenAI(promptToUse);
        }

        let finalImageUrl: string;

        if (isVercel) {
          // On Vercel: Save backgrounds to Blob storage (only backgrounds allowed on Vercel)
          send({ status: 'progress', message: 'Saving to cloud storage...' });
          
          const blobPath = `images/backgrounds/world_${item}_${timestamp}.jpg`;
          finalImageUrl = await saveToBlob(imageBuffer, blobPath, 'image/jpeg');
          send({ status: 'progress', message: 'Background saved to cloud!' });
          
        } else {
          // Local development: Save to filesystem with background removal
          send({ status: 'progress', message: 'Saving raw image...' });
          
          let baseDir: string;
          let rawDir: string;
          let filename: string;
          let publicPath: string;

          if (isBackground) {
            baseDir = path.join(process.cwd(), 'public', 'images', 'backgrounds');
            rawDir = path.join(baseDir, 'raw');
            filename = `world_${item}_${timestamp}.jpg`;
            publicPath = `/images/backgrounds/${filename}`;
          } else {
            const folderName = type === 'letter' ? item.toLowerCase() : item;
            baseDir = path.join(process.cwd(), 'public', 'images', 'generated', type === 'letter' ? 'alphabet' : 'numbers', folderName);
            rawDir = path.join(baseDir, 'raw');
            filename = `${folderName}_${timestamp}.png`;
            publicPath = `/images/generated/${type === 'letter' ? 'alphabet' : 'numbers'}/${folderName}/${filename}`;
          }

          const processedFilepath = saveToFilesystem(imageBuffer, baseDir, rawDir, filename);

          if (isBackground) {
            send({ status: 'progress', message: 'Background saved!' });
          } else {
            send({ status: 'progress', message: 'Removing background...' });
            try {
              await removeBackground(processedFilepath);
              send({ status: 'progress', message: 'Background removed!' });
            } catch (bgError) {
              console.error('[Background Removal] Error:', bgError);
              send({ status: 'progress', message: 'Background removal failed, using original image' });
            }
          }
          
          finalImageUrl = publicPath;
        }

        send({ 
          status: 'complete', 
          message: 'Image generated successfully!',
          image: finalImageUrl,
        });

      } catch (error) {
        send({ 
          status: 'error', 
          message: error instanceof Error ? error.message : 'Unknown error' 
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
