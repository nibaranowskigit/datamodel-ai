import { createAnthropic } from '@ai-sdk/anthropic';

export const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export const DEFAULT_MODEL = 'claude-sonnet-4-20250514' as const;

