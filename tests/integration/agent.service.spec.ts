import { AgentService } from '../../src/application/services/agent.service';
import { EnvConfig } from '../../src/shared/config/environment.config';
import { ILogger } from '../../src/shared/logger/logger.interface';

// Mock generateText del paquete 'ai' directamente
const mockGenerateText = jest.fn();
jest.mock('ai', () => ({
  ...jest.requireActual('ai'),
  generateText: (...args: unknown[]) => mockGenerateText(...args),
  stepCountIs: jest.fn().mockReturnValue({ type: 'stepCount', count: 3 }),
  tool: jest.fn().mockImplementation((config: unknown) => config),
}));

const createMockLogger = (): ILogger => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
});

describe('AgentService Integration', () => {
  const mockConfig: EnvConfig = {
    AI_PROVIDER: 'openai',
    AI_API_KEY: 'sk-test-key',
    AI_MODEL: 'gpt-4-turbo',
    AI_BASE_URL: 'https://api.openai.com/v1',
    AI_TEMPERATURE: 0.3,
    AI_MAX_TOKENS: 2000,
    AI_MAX_ITERATIONS: 3,
    AI_TIMEOUT: 60,
    GITHUB_TOKEN: 'test-token',
    GITHUB_REPOSITORY_OWNER: 'test-owner',
    GITHUB_REPOSITORY_NAME: 'test-repo',
    LOG_LEVEL: 'info',
    DEBUG_TOOLS: false,
    DEBUG_PROMPTS: false,
  };

  let agentService: AgentService;
  let logger: ILogger;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = createMockLogger();
    agentService = new AgentService(mockConfig, logger);

    mockGenerateText.mockResolvedValue({
      text: '##  Análisis del Issue\nMock investigation result.',
      usage: { totalTokens: 50 },
      steps: [{ toolCalls: [] }],
    });
  });

  it('should investigate an issue and return a plan', async () => {
    const result = await agentService.investigate(
      'Test issue title',
      'Test issue description'
    );

    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
    expect(result).toContain('Mock investigation');
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
  });

  it('should handle /update command', async () => {
    const result = await agentService.handleCommand(
      '/update',
      'Test issue',
      'Description'
    );

    expect(result.response).toBeDefined();
    expect(result.wasUpdate).toBe(true);
    expect(result.response).toContain('Mock investigation');
  });

  it('should handle /ask command', async () => {
    const result = await agentService.handleCommand(
      '/ask What files are affected?',
      'Test issue',
      'Description'
    );

    expect(result.response).toBeDefined();
    expect(result.wasUpdate).toBe(false);
  });

  it('should handle /investigate command', async () => {
    const result = await agentService.handleCommand(
      '/investigate user module',
      'Test issue',
      'Description'
    );

    expect(result.response).toBeDefined();
    expect(result.wasUpdate).toBe(false);
  });

  it('should log debug when DEBUG_PROMPTS is enabled', async () => {
    const debugConfig = { ...mockConfig, DEBUG_PROMPTS: true };
    const debugLogger = createMockLogger();
    const debugAgent = new AgentService(debugConfig, debugLogger);

    await debugAgent.investigate('Test', 'Test');

    expect(debugLogger.debug).toHaveBeenCalled();
  });
});
