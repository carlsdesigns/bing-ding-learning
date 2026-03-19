import { NextRequest } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

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

function getConfig(type: 'letter' | 'number', item: string) {
  if (type === 'letter') {
    return LETTER_CONFIG[item.toUpperCase()];
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

async function generateWithGoogle(prompt: string): Promise<Buffer> {
  const fullPrompt = `${prompt}, ${IMAGE_STYLE}`;
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
          aspectRatio: '1:1',
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

        send({ status: 'started', message: `Generating image for ${type} "${item}"...` });
        send({ status: 'progress', message: `Using prompt: ${promptToUse}` });

        // Generate unique filename with timestamp
        const timestamp = Date.now();
        const folderName = type === 'letter' ? item.toLowerCase() : item;
        const baseDir = path.join(process.cwd(), 'public', 'images', 'generated', type === 'letter' ? 'alphabet' : 'numbers', folderName);
        const rawDir = path.join(baseDir, 'raw');
        
        // Create folders if they don't exist
        if (!fs.existsSync(baseDir)) {
          fs.mkdirSync(baseDir, { recursive: true });
        }
        if (!fs.existsSync(rawDir)) {
          fs.mkdirSync(rawDir, { recursive: true });
        }

        const filename = `${folderName}_${timestamp}.png`;
        const rawFilepath = path.join(rawDir, filename);
        const processedFilepath = path.join(baseDir, filename);
        const publicPath = `/images/generated/${type === 'letter' ? 'alphabet' : 'numbers'}/${folderName}/${filename}`;

        send({ status: 'progress', message: `Calling ${provider} API...` });

        let imageBuffer: Buffer;
        if (provider === 'google') {
          imageBuffer = await generateWithGoogle(promptToUse);
        } else {
          imageBuffer = await generateWithOpenAI(promptToUse);
        }

        send({ status: 'progress', message: 'Saving raw image...' });
        fs.writeFileSync(rawFilepath, imageBuffer);

        send({ status: 'progress', message: 'Removing background...' });
        try {
          // Copy raw to processed location first
          fs.copyFileSync(rawFilepath, processedFilepath);
          // Run background removal on the processed copy
          await removeBackground(processedFilepath);
          send({ status: 'progress', message: 'Background removed!' });
        } catch (bgError) {
          console.error('[Background Removal] Error:', bgError);
          // If background removal fails, just copy the raw image
          fs.copyFileSync(rawFilepath, processedFilepath);
          send({ status: 'progress', message: 'Background removal failed, using original image' });
        }

        send({ 
          status: 'complete', 
          message: 'Image generated successfully!',
          image: publicPath,
          filename,
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
