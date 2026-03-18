import Anthropic from '@anthropic-ai/sdk';
import type { AIProviderClient, AIMessage, AIConfig, AIResponse, LearningContext } from '../types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const anthropicClient: AIProviderClient = {
  async chat(messages: AIMessage[], config?: Partial<AIConfig>): Promise<AIResponse> {
    const model = config?.model || process.env.ANTHROPIC_MODEL || 'claude-3-opus-20240229';

    const systemMessage = messages.find((m) => m.role === 'system');
    const chatMessages = messages.filter((m) => m.role !== 'system');

    const response = await anthropic.messages.create({
      model,
      max_tokens: config?.maxTokens ?? 500,
      system: systemMessage?.content,
      messages: chatMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    const content = response.content[0];
    const textContent = content.type === 'text' ? content.text : '';

    return {
      content: textContent,
      provider: 'anthropic',
      model,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    };
  },

  async generateHint(context: LearningContext): Promise<string> {
    const prompt = buildHintPrompt(context);
    const response = await this.chat([
      { role: 'system', content: getSystemPrompt() },
      { role: 'user', content: prompt },
    ]);
    return response.content;
  },

  async generateEncouragement(correct: boolean): Promise<string> {
    const prompt = correct
      ? 'Generate a short, enthusiastic encouragement for a child who got an answer correct. Keep it under 15 words.'
      : 'Generate a gentle, supportive message for a child who got an answer wrong. Encourage them to try again. Keep it under 20 words.';

    const response = await this.chat([
      { role: 'system', content: getSystemPrompt() },
      { role: 'user', content: prompt },
    ]);
    return response.content;
  },
};

function getSystemPrompt(): string {
  return `You are a friendly, encouraging learning assistant for young children (ages 3-7).
Your responses should be:
- Simple and easy to understand
- Warm and encouraging
- Age-appropriate
- Brief (children have short attention spans)
Never use complex words or scary language.`;
}

function buildHintPrompt(context: LearningContext): string {
  const { moduleType, currentItem, attempts, difficulty, learnerName } = context;
  const name = learnerName || 'friend';

  if (moduleType === 'numbers') {
    return `Give a gentle hint to help ${name} recognize or count to the number ${currentItem}. 
This is attempt ${attempts}. Difficulty: ${difficulty}. 
Keep the hint simple and fun. Max 2 sentences.`;
  } else {
    return `Give a gentle hint to help ${name} recognize the letter ${currentItem}. 
This is attempt ${attempts}. Difficulty: ${difficulty}.
You could mention what sound it makes or a word that starts with it. Max 2 sentences.`;
  }
}
