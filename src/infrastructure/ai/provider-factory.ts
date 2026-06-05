import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { LanguageModel } from 'ai';
import { EnvConfig } from '../../shared/config/environment.config';

export class ProviderFactory {
  static create(config: EnvConfig): LanguageModel {
    switch (config.AI_PROVIDER) {
      case 'openai':
        return createOpenAI({
          apiKey: config.AI_API_KEY,
          baseURL: config.AI_BASE_URL || 'https://api.openai.com/v1',
        })(config.AI_MODEL);

      case 'anthropic':
        return createAnthropic({
          apiKey: config.AI_API_KEY,
        })(config.AI_MODEL);

      case 'custom':
        if (!config.AI_BASE_URL) {
          throw new Error('AI_BASE_URL is required for custom provider');
        }
        return createOpenAI({
          apiKey: config.AI_API_KEY,
          baseURL: config.AI_BASE_URL,
        })(config.AI_MODEL);

      default:
        throw new Error(`Unsupported AI provider: ${config.AI_PROVIDER}`);
    }
  }
}
