/**
 * =============================================================================
 * IMAGE GENERATION CONFIGURATION
 * =============================================================================
 * 
 * Edit this file to customize the generated images for Bing Ding Learning.
 * After making changes, run: npm run generate:images
 * 
 */

/**
 * GLOBAL STYLE PROMPT
 * -------------------
 * This is appended to EVERY image prompt to ensure visual consistency.
 * Edit this to change the overall look and feel of all generated images.
 */
export const IMAGE_STYLE = `
  cute friendly cartoon illustration for children,
  flat vector art style with clean sharp edges,
  simple rounded shapes with soft pastel colors,
  educational cheerful welcoming mood,
  CRITICAL: background must be solid bright magenta pink color (hex FF00FF, RGB 255,0,255) - hot pink/fuchsia background - completely flat uniform solid color with no variation or texture,
  the subject has a thick pure white border outline around it like a die-cut sticker,
  no shadows, no gradients, no text or letters,
  high quality digital art, single centered subject floating on flat solid magenta pink background
`.trim().replace(/\n/g, ' ');

/**
 * IMAGE GENERATION PROVIDER
 * -------------------------
 * Choose which AI to use for image generation.
 * Options: 'openai' (DALL-E) or 'google' (Imagen via Gemini)
 */
export const IMAGE_PROVIDER: 'openai' | 'google' = 'google';

/**
 * DALL-E SETTINGS (OpenAI)
 * ------------------------
 * Used when IMAGE_PROVIDER = 'openai'
 */
export const DALLE_CONFIG = {
  model: 'dall-e-3' as const,
  size: '1024x1024' as const,
  quality: 'standard' as const, // 'standard' or 'hd' (hd costs more)
};

/**
 * IMAGEN SETTINGS (Google Gemini)
 * -------------------------------
 * Used when IMAGE_PROVIDER = 'google'
 */
export const IMAGEN_CONFIG = {
  model: 'imagen-3.0-generate-002', // Imagen 3 model
};

/**
 * LETTER IMAGES
 * -------------
 * Each letter maps to a word and a custom prompt.
 * The IMAGE_STYLE is automatically appended.
 * 
 * Format:
 *   LETTER: { word: 'Word', prompt: 'Custom prompt for this letter' }
 */
export const LETTER_CONFIG: Record<string, { word: string; prompt: string }> = {
  A: { 
    word: 'Apple', 
    prompt: 'A friendly shiny red apple with a cute smiling face, small green leaf on top' 
  },
  B: { 
    word: 'Bear', 
    prompt: 'A cute friendly brown teddy bear waving hello, soft and cuddly' 
  },
  C: { 
    word: 'Cat', 
    prompt: 'An adorable orange tabby cat sitting happily, fluffy and playful' 
  },
  D: { 
    word: 'Dog', 
    prompt: 'A happy golden retriever puppy with floppy ears, friendly and excited' 
  },
  E: { 
    word: 'Elephant', 
    prompt: 'A cute baby elephant with big ears, grey and friendly, trunk up happily' 
  },
  F: { 
    word: 'Fish', 
    prompt: 'A colorful tropical fish with rainbow scales, swimming happily' 
  },
  G: { 
    word: 'Giraffe', 
    prompt: 'A friendly baby giraffe with a long neck, yellow with brown spots' 
  },
  H: { 
    word: 'Hat', 
    prompt: 'A colorful party hat with polka dots and a pom-pom on top' 
  },
  I: { 
    word: 'Ice cream', 
    prompt: 'A delicious ice cream cone with three colorful scoops, sprinkles on top' 
  },
  J: { 
    word: 'Jellyfish', 
    prompt: 'A cute pink jellyfish floating gently, translucent and magical' 
  },
  K: { 
    word: 'Kite', 
    prompt: 'A bright colorful diamond kite flying high, with a flowing tail' 
  },
  L: { 
    word: 'Lion', 
    prompt: 'A cute baby lion cub with a fluffy mane, friendly and brave' 
  },
  M: { 
    word: 'Moon', 
    prompt: 'A friendly crescent moon with a gentle smile, soft yellow glow' 
  },
  N: { 
    word: 'Nest', 
    prompt: 'A cozy bird nest made of twigs with three small blue eggs inside' 
  },
  O: { 
    word: 'Owl', 
    prompt: 'A wise and cute owl with big round eyes, brown feathers, sitting on a branch' 
  },
  P: { 
    word: 'Penguin', 
    prompt: 'An adorable baby penguin with a round belly, black and white, waddling' 
  },
  Q: { 
    word: 'Queen', 
    prompt: 'A friendly cartoon queen with a golden crown and a kind smile' 
  },
  R: { 
    word: 'Rainbow', 
    prompt: 'A beautiful bright rainbow arching across, all seven colors vivid' 
  },
  S: { 
    word: 'Sun', 
    prompt: 'A happy smiling sun with warm rays, bright yellow and cheerful' 
  },
  T: { 
    word: 'Tiger', 
    prompt: 'A cute baby tiger cub with orange and black stripes, playful' 
  },
  U: { 
    word: 'Umbrella', 
    prompt: 'A colorful open umbrella with rainbow stripes, cheerful and bright' 
  },
  V: { 
    word: 'Violin', 
    prompt: 'A beautiful wooden violin with a bow, elegant and musical' 
  },
  W: { 
    word: 'Whale', 
    prompt: 'A friendly blue whale swimming, spouting water happily' 
  },
  X: { 
    word: 'Xylophone', 
    prompt: 'A colorful xylophone with rainbow bars and two mallets' 
  },
  Y: { 
    word: 'Yacht', 
    prompt: 'A cute sailboat on calm blue water, white sails catching the wind' 
  },
  Z: { 
    word: 'Zebra', 
    prompt: 'A friendly zebra with black and white stripes, standing proudly' 
  },
};

/**
 * NUMBER IMAGES
 * -------------
 * Each number maps to a description and custom prompt.
 * The prompt should visually represent the quantity.
 * 
 * Format:
 *   'NUMBER': { description: 'Short desc', prompt: 'Custom prompt' }
 */
export const NUMBER_CONFIG: Record<string, { description: string; prompt: string }> = {
  '0': { 
    description: 'Zero', 
    prompt: 'A puffer fish in the shape of an O, with a hole in the middle of it' 
  },
  '1': { 
    description: 'One balloon', 
    prompt: 'One single red balloon, in the shape of a number 1 floating, with a curly string' 
  },
  '2': { 
    description: 'Two kittens', 
    prompt: 'A cat in the shape of a number 2, orange and grey' 
  },
  '3': { 
    description: 'Three butterflies', 
    prompt: 'Three colorful caterpillars, pink blue and yellow, in the shape of a 3' 
  },
  '4': { 
    description: 'Four apples', 
    prompt: 'a flamingo in the shape of a 4, standing on one leg' 
  },
  '5': { 
    description: 'Five ducks', 
    prompt: 'a snake in the shape of a 5' 
  },
  '6': { 
    description: 'Six crayons', 
    prompt: 'a snail in the shape of a 6' 
  },
  '7': { 
    description: 'Seven stars', 
    prompt: 'a Praying Mantis in the shape of a 7' 
  },
  '8': { 
    description: 'Eight bees', 
    prompt: 'Coiled Millipede in the shape of an 8' 
  },
  '9': { 
    description: 'Nine balls', 
    prompt: 'a Tadpole in the shape of a 9' 
  },
};
