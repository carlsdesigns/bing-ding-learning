# Bing Ding Learning

An interactive, touch-friendly learning tool for children to learn numbers and the alphabet. Designed for tablets and laptops with full touch support.

## Features

- **Touch-First Design**: Optimized for tablet and laptop touch interactions
- **Numbers Learning**: Interactive counting, number recognition, and basic math
- **Alphabet Learning**: Letter recognition, phonics, and word building
- **AI-Powered Assistance**: Switchable AI models (OpenAI, Anthropic, Google) for hints and encouragement
- **Voice Feedback**: ElevenLabs integration for natural voice narration
- **Progress Tracking**: Session-based learning analytics and progress reports

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + Framer Motion for animations
- **Database**: SQLite via Prisma (easy to switch to PostgreSQL)
- **AI**: Multi-provider support (OpenAI, Anthropic, Google)
- **Voice**: ElevenLabs Text-to-Speech
- **State**: Zustand for client state

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
# Install dependencies
npm install

# Copy environment file and add your keys
cp .env.example .env

# Set up database
npm run db:generate
npm run db:push

# Start development server
npm run dev
```

### Environment Setup

Edit `.env` with your API keys:

1. **AI Provider Keys**: Add keys for OpenAI, Anthropic, and/or Google
2. **ElevenLabs**: Add your API key and preferred voice ID
3. **Database**: Default SQLite works out of the box

## Project Structure

```
bing-ding-learning/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes
│   │   │   ├── ai/           # AI chat endpoints
│   │   │   ├── voice/        # ElevenLabs TTS
│   │   │   └── sessions/     # Session tracking
│   │   ├── learn/            # Learning modules
│   │   │   ├── numbers/      # Number learning activities
│   │   │   └── alphabet/     # Alphabet learning activities
│   │   └── reports/          # Progress reports
│   ├── components/            # React components
│   │   ├── ui/               # Base UI components
│   │   ├── learning/         # Learning activity components
│   │   └── touch/            # Touch interaction components
│   ├── lib/                   # Utilities and services
│   │   ├── ai/               # AI provider abstraction
│   │   ├── voice/            # ElevenLabs service
│   │   └── db/               # Database utilities
│   ├── hooks/                 # Custom React hooks
│   └── stores/               # Zustand state stores
├── prisma/                    # Database schema and migrations
├── public/                    # Static assets
│   ├── sounds/               # Sound effects
│   └── images/               # Learning images
└── data/                      # SQLite database file
```

## AI Model Switching

The app supports multiple AI providers. Switch between them:

```typescript
import { useAIStore } from '@/stores/ai-store';

const { setProvider, setModel } = useAIStore();

// Switch to Claude
setProvider('anthropic');
setModel('claude-3-opus-20240229');

// Switch to GPT-4
setProvider('openai');
setModel('gpt-4-turbo');
```

## License

MIT
