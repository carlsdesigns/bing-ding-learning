import { create } from 'zustand';
import { LETTER_CONFIG, NUMBER_CONFIG } from '@/../scripts/image-config';

interface CanvasObject {
  id: string;
  key: string;
  word: string;
  imageSource: string;
  x: number;
  y: number;
  scale: number;
  zIndex: number;
}

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  id: string;
  points: Point[];
  color: string;
  tool: 'pen' | 'highlighter';
  width: number;
}

type DrawingTool = 'none' | 'pen' | 'highlighter';

const RAINBOW_COLORS = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#EAB308', // Yellow
  '#22C55E', // Green
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#78716C', // Brown
  '#171717', // Black
];

interface PlaygroundState {
  canvasObjects: CanvasObject[];
  isSoundEnabled: boolean;
  ttsState: 'idle' | 'speaking';
  currentUtterance: string | null;
  keyboardMode: 'letters' | 'numbers';
  isImagesLoaded: boolean;
  letterImages: Record<string, string>;
  numberImages: Record<string, string>;
  letterWords: Record<string, string>;
  numberWords: Record<string, string>;
  maxZIndex: number;
  canvasSize: { width: number; height: number };
  // Drawing state
  activeTool: DrawingTool;
  currentColor: string;
  penStrokes: Stroke[];
  highlighterStrokes: Stroke[];
  currentStroke: Stroke | null;
  // Background state
  currentBackground: string | null;
  availableBackgrounds: string[];
}

interface PlaygroundActions {
  preloadImages: () => Promise<void>;
  addCanvasObject: (key: string) => void;
  updateObjectPosition: (id: string, x: number, y: number) => void;
  updateObjectScale: (id: string, scale: number) => void;
  bringToFront: (id: string) => void;
  removeObject: (id: string) => void;
  clearCanvas: () => void;
  toggleSound: () => void;
  toggleKeyboardMode: () => void;
  setTtsState: (state: 'idle' | 'speaking') => void;
  setCurrentUtterance: (key: string | null) => void;
  setCanvasSize: (width: number, height: number) => void;
  // Drawing actions
  setActiveTool: (tool: DrawingTool) => void;
  setCurrentColor: (color: string) => void;
  startStroke: (point: Point) => void;
  addPointToStroke: (point: Point) => void;
  endStroke: () => void;
  // Background actions
  setBackground: (background: string | null) => void;
  loadBackgrounds: () => Promise<void>;
}

export { RAINBOW_COLORS };
export type { Stroke, Point, DrawingTool };

const MAX_OBJECTS = 300;
const SPAWN_SIZE_PERCENT = 0.10; // 10% of screen width

// Default world backgrounds (excluding blank)
const DEFAULT_BACKGROUNDS = [
  '/images/backgrounds/world_undersea.jpg',
  '/images/backgrounds/world_land.jpg',
  '/images/backgrounds/world_schoolyard.jpg',
  '/images/backgrounds/world_clouds.jpg',
  '/images/backgrounds/world_stars.jpg',
  '/images/backgrounds/world_frozen.jpg',
  '/images/backgrounds/world_desert.jpg',
];

function getRandomBackground(): string {
  return DEFAULT_BACKGROUNDS[Math.floor(Math.random() * DEFAULT_BACKGROUNDS.length)];
}

export const usePlaygroundStore = create<PlaygroundState & PlaygroundActions>((set, get) => ({
  canvasObjects: [],
  isSoundEnabled: true,
  ttsState: 'idle',
  currentUtterance: null,
  keyboardMode: 'letters',
  isImagesLoaded: false,
  letterImages: {},
  numberImages: {},
  letterWords: {},
  numberWords: {},
  maxZIndex: 0,
  canvasSize: { width: 800, height: 600 },
  // Drawing state
  activeTool: 'none',
  currentColor: RAINBOW_COLORS[0],
  penStrokes: [],
  highlighterStrokes: [],
  currentStroke: null,
  // Background state - start with a random background
  currentBackground: getRandomBackground(),
  availableBackgrounds: [],

  preloadImages: async () => {
    try {
      const response = await fetch('/api/images');
      const data = await response.json();
      
      const letterImages: Record<string, string> = {};
      const letterWords: Record<string, string> = {};
      const numberImages: Record<string, string> = {};
      const numberWords: Record<string, string> = {};

      // Map letter images and words
      if (data.letters) {
        data.letters.forEach((item: { item: string; selectedImage?: string }) => {
          if (item.selectedImage) {
            letterImages[item.item.toUpperCase()] = item.selectedImage;
          }
          // Get word from LETTER_CONFIG
          const configEntry = LETTER_CONFIG[item.item.toUpperCase()];
          if (configEntry) {
            letterWords[item.item.toUpperCase()] = configEntry.word;
          }
        });
      }

      // Map number images and words
      if (data.numbers) {
        data.numbers.forEach((item: { item: string; selectedImage?: string }) => {
          if (item.selectedImage) {
            numberImages[item.item] = item.selectedImage;
          }
          // Get description from NUMBER_CONFIG
          const configEntry = NUMBER_CONFIG[item.item];
          if (configEntry) {
            numberWords[item.item] = configEntry.description;
          }
        });
      }

      set({
        letterImages,
        letterWords,
        numberImages,
        numberWords,
        isImagesLoaded: true,
      });

      // Preload images into browser cache
      const allImages = [...Object.values(letterImages), ...Object.values(numberImages)];
      await Promise.all(
        allImages.map((src) => {
          return new Promise((resolve) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = resolve;
            img.src = src;
          });
        })
      );
    } catch (error) {
      console.error('Failed to preload images:', error);
      set({ isImagesLoaded: true }); // Continue anyway
    }
  },

  addCanvasObject: (key: string) => {
    const state = get();
    const isLetter = /^[A-Z]$/i.test(key);
    const normalizedKey = isLetter ? key.toUpperCase() : key;
    
    const imageSource = isLetter 
      ? state.letterImages[normalizedKey] 
      : state.numberImages[normalizedKey];
    
    const word = isLetter
      ? state.letterWords[normalizedKey]
      : state.numberWords[normalizedKey];

    if (!imageSource) return;

    const { width, height } = state.canvasSize;
    const spawnSize = width * SPAWN_SIZE_PERCENT;
    const padding = spawnSize / 2;

    // Random position within canvas bounds
    const x = padding + Math.random() * (width - spawnSize - padding * 2);
    const y = padding + Math.random() * (height - spawnSize - padding * 2);

    const newObject: CanvasObject = {
      id: `${normalizedKey}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      key: normalizedKey,
      word: word || normalizedKey,
      imageSource,
      x,
      y,
      scale: 1,
      zIndex: state.maxZIndex + 1,
    };

    let newObjects = [...state.canvasObjects, newObject];
    
    // FIFO removal if over limit
    if (newObjects.length > MAX_OBJECTS) {
      newObjects = newObjects.slice(newObjects.length - MAX_OBJECTS);
    }

    set({
      canvasObjects: newObjects,
      maxZIndex: state.maxZIndex + 1,
    });
  },

  updateObjectPosition: (id: string, x: number, y: number) => {
    set((state) => ({
      canvasObjects: state.canvasObjects.map((obj) =>
        obj.id === id ? { ...obj, x, y } : obj
      ),
    }));
  },

  updateObjectScale: (id: string, scale: number) => {
    const clampedScale = Math.max(0.5, Math.min(3, scale));
    set((state) => ({
      canvasObjects: state.canvasObjects.map((obj) =>
        obj.id === id ? { ...obj, scale: clampedScale } : obj
      ),
    }));
  },

  bringToFront: (id: string) => {
    const state = get();
    const newMaxZ = state.maxZIndex + 1;
    set({
      canvasObjects: state.canvasObjects.map((obj) =>
        obj.id === id ? { ...obj, zIndex: newMaxZ } : obj
      ),
      maxZIndex: newMaxZ,
    });
  },

  removeObject: (id: string) => {
    set((state) => ({
      canvasObjects: state.canvasObjects.filter((obj) => obj.id !== id),
    }));
  },

  clearCanvas: () => {
    set({ 
      canvasObjects: [], 
      maxZIndex: 0,
      penStrokes: [],
      highlighterStrokes: [],
      currentStroke: null,
    });
  },

  toggleSound: () => {
    set((state) => ({ isSoundEnabled: !state.isSoundEnabled }));
  },

  toggleKeyboardMode: () => {
    set((state) => ({
      keyboardMode: state.keyboardMode === 'letters' ? 'numbers' : 'letters',
    }));
  },

  setTtsState: (ttsState: 'idle' | 'speaking') => {
    set({ ttsState });
  },

  setCurrentUtterance: (currentUtterance: string | null) => {
    set({ currentUtterance });
  },

  setCanvasSize: (width: number, height: number) => {
    set({ canvasSize: { width, height } });
  },

  // Drawing actions
  setActiveTool: (tool: DrawingTool) => {
    set({ activeTool: tool });
  },

  setCurrentColor: (color: string) => {
    set({ currentColor: color });
  },

  startStroke: (point: Point) => {
    const state = get();
    if (state.activeTool === 'none') return;
    
    const newStroke: Stroke = {
      id: `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      points: [point],
      color: state.currentColor,
      tool: state.activeTool,
      width: state.activeTool === 'pen' ? 5 : 25,
    };
    
    set({ currentStroke: newStroke });
  },

  addPointToStroke: (point: Point) => {
    const state = get();
    if (!state.currentStroke) return;
    
    set({
      currentStroke: {
        ...state.currentStroke,
        points: [...state.currentStroke.points, point],
      },
    });
  },

  endStroke: () => {
    const state = get();
    if (!state.currentStroke) return;
    
    if (state.currentStroke.points.length > 1) {
      if (state.currentStroke.tool === 'pen') {
        set({
          penStrokes: [...state.penStrokes, state.currentStroke],
          currentStroke: null,
        });
      } else {
        set({
          highlighterStrokes: [...state.highlighterStrokes, state.currentStroke],
          currentStroke: null,
        });
      }
    } else {
      set({ currentStroke: null });
    }
  },

  // Background actions
  setBackground: (background: string | null) => {
    set({ currentBackground: background });
  },

  loadBackgrounds: async () => {
    try {
      const response = await fetch('/api/backgrounds');
      if (response.ok) {
        const data = await response.json();
        set({ availableBackgrounds: data.backgrounds || [] });
      }
    } catch (error) {
      console.error('Failed to load backgrounds:', error);
    }
  },
}));
