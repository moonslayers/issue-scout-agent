import { ProviderFactory } from '../../../src/infrastructure/ai/provider-factory';
import { EnvConfig } from '../../../src/shared/config/environment.config';

describe('ProviderFactory', () => {
  const baseConfig: EnvConfig = {
    AI_PROVIDER: 'openai',
    AI_API_KEY: 'sk-test-key',
    AI_MODEL: 'gpt-4-turbo',
    AI_BASE_URL: 'https://api.openai.com/v1',
    AI_TEMPERATURE: 0.3,
    AI_MAX_TOKENS: 2000,
    AI_MAX_ITERATIONS: 10,
    AI_TIMEOUT: 60,
    GITHUB_TOKEN: 'test-token',
    GITHUB_REPOSITORY_OWNER: 'test-owner',
    GITHUB_REPOSITORY_NAME: 'test-repo',
    LOG_LEVEL: 'info',
    DEBUG_TOOLS: false,
    DEBUG_PROMPTS: false,
  };

  it('should create an OpenAI provider', () => {
    const model = ProviderFactory.create({ ...baseConfig, AI_PROVIDER: 'openai' });
    expect(model).toBeDefined();
    // LanguageModel es un tipo unión complejo, solo verificamos que no sea null/undefined
    expect(typeof model).not.toBe('undefined');
  });

  it('should create an Anthropic provider', () => {
    const model = ProviderFactory.create({ ...baseConfig, AI_PROVIDER: 'anthropic' });
    expect(model).toBeDefined();
  });

  it('should create a custom provider with base URL', () => {
    const model = ProviderFactory.create({
      ...baseConfig,
      AI_PROVIDER: 'custom',
      AI_BASE_URL: 'https://custom-endpoint.com/v1',
    });
    expect(model).toBeDefined();
  });

  it('should throw error for custom provider without base URL', () => {
    expect(() =>
      ProviderFactory.create({
        ...baseConfig,
        AI_PROVIDER: 'custom',
        AI_BASE_URL: undefined,
      })
    ).toThrow('AI_BASE_URL is required');
  });

  it('should throw error for unsupported provider', () => {
    expect(() =>
      ProviderFactory.create({
        ...baseConfig,
        AI_PROVIDER: 'unsupported' as any,
      })
    ).toThrow('Unsupported AI provider');
  });
});
