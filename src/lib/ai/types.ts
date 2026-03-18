export type AIProvider = 'openai' | 'anthropic' | 'google';

export interface AIConfig {
  provider: AIProvider;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIResponse {
  content: string;
  provider: AIProvider;
  model: string;
  tokensUsed?: number;
}

export interface AIProviderClient {
  chat(messages: AIMessage[], config?: Partial<AIConfig>): Promise<AIResponse>;
  generateHint(context: LearningContext): Promise<string>;
  generateEncouragement(correct: boolean): Promise<string>;
}

export interface LearningContext {
  moduleType: 'numbers' | 'alphabet';
  currentItem: string;
  attempts: number;
  difficulty: 'easy' | 'medium' | 'hard';
  learnerName?: string;
}

export const DEFAULT_CONFIGS: Record<AIProvider, { model: string }> = {
  openai: { model: 'gpt-4-turbo' },
  anthropic: { model: 'claude-3-opus-20240229' },
  google: { model: 'gemini-pro' },
};

export const AVAILABLE_MODELS: Record<AIProvider, string[]> = {
  openai: ['gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
  google: ['gemini-pro', 'gemini-pro-vision'],
};
