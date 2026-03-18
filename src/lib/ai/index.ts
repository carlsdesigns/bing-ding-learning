import type { AIProvider, AIProviderClient, AIConfig, AIMessage, AIResponse, LearningContext } from './types';
import { openaiClient } from './providers/openai';
import { anthropicClient } from './providers/anthropic';
import { googleClient } from './providers/google';

export * from './types';

const providers: Record<AIProvider, AIProviderClient> = {
  openai: openaiClient,
  anthropic: anthropicClient,
  google: googleClient,
};

export function getAIClient(provider?: AIProvider): AIProviderClient {
  const selectedProvider = provider || (process.env.AI_PROVIDER as AIProvider) || 'openai';
  return providers[selectedProvider];
}

export async function chat(
  messages: AIMessage[],
  config?: Partial<AIConfig>
): Promise<AIResponse> {
  const client = getAIClient(config?.provider);
  return client.chat(messages, config);
}

export async function generateHint(
  context: LearningContext,
  provider?: AIProvider
): Promise<string> {
  const client = getAIClient(provider);
  return client.generateHint(context);
}

export async function generateEncouragement(
  correct: boolean,
  provider?: AIProvider
): Promise<string> {
  const client = getAIClient(provider);
  return client.generateEncouragement(correct);
}
