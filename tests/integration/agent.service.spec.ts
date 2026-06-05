import { AgentService } from '../../src/application/services/agent.service';
import { EnvConfig } from '../../src/shared/config/environment.config';
import { ILogger } from '../../src/shared/logger/logger.interface';

// Mock generateText del paquete 'ai' directamente
const mockGenerateText = jest.fn();
jest.mock('ai', () => ({
  ...jest.requireActual('ai'),
  generateText: (...args: unknown[]) => mockGenerateText(...args),
  stepCountIs: jest.fn().mockReturnValue({ type: 'stepCount', count: 999 }),
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
    AI_TIMEOUT: 60,
    AI_PROVIDER_OPTIONS: undefined,
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

    // Default mock: returns text for any generateText call
    mockGenerateText.mockResolvedValue({
      text: '## 🔍 Investigación\nMock investigation result.',
      usage: { totalTokens: 50 },
      steps: [{ toolCalls: [] }],
    });
  });

  it('should investigate an issue with 2-phase approach', async () => {
    const result = await agentService.investigate(
      'Test issue title',
      'Test issue description'
    );

    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
    expect(result).toContain('Mock investigation');
    // Investigate calls generateText 2 veces: explore + generate
    expect(mockGenerateText).toHaveBeenCalledTimes(2);
  });

  it('should retry when plan generation returns empty', async () => {
    // Primera llamada (explore) retorna texto válido
    // Segunda llamada (generate 1er intento) retorna vacío
    // Tercera llamada (generate 2do intento) retorna texto
    mockGenerateText
      .mockResolvedValueOnce({
        text: 'Exploración completada.',
        usage: { totalTokens: 30 },
        steps: [{ toolCalls: [] }],
      })
      .mockResolvedValueOnce({
        text: '',
        usage: { totalTokens: 10 },
        steps: [],
      })
      .mockResolvedValueOnce({
        text: '## 🔍 Investigación\nPlan after retry.',
        usage: { totalTokens: 40 },
        steps: [],
      });

    const result = await agentService.investigate('Test', 'Description');

    expect(result).toBe('## 🔍 Investigación\nPlan after retry.');
    // explore (1) + generate fail (1) + generate success (1) = 3
    expect(mockGenerateText).toHaveBeenCalledTimes(3);
  });

  it('should return fallback message when all retries fail', async () => {
    // Explore returns text, but all generate attempts return empty
    mockGenerateText
      .mockResolvedValueOnce({
        text: 'Exploración completada.',
        usage: { totalTokens: 30 },
        steps: [{ toolCalls: [] }],
      })
      .mockResolvedValue({ text: '', usage: { totalTokens: 5 }, steps: [] });

    const result = await agentService.investigate('Test', 'Description');

    expect(result).toContain('No se pudo generar un plan técnico');
    // explore (1) + 3 generate attempts = 4
    expect(mockGenerateText).toHaveBeenCalledTimes(4);
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

  it('should retry command when response is empty', async () => {
    mockGenerateText
      .mockResolvedValueOnce({
        text: '',
        usage: { totalTokens: 5 },
        steps: [],
      })
      .mockResolvedValueOnce({
        text: 'Respuesta after retry.',
        usage: { totalTokens: 20 },
        steps: [],
      });

    const result = await agentService.handleCommand(
      '/ask test',
      'Test',
      'Desc'
    );

    expect(result.response).toBe('Respuesta after retry.');
    expect(mockGenerateText).toHaveBeenCalledTimes(2);
  });

  it('should log debug when DEBUG_PROMPTS is enabled', async () => {
    const debugConfig = { ...mockConfig, DEBUG_PROMPTS: true };
    const debugLogger = createMockLogger();
    const debugAgent = new AgentService(debugConfig, debugLogger);

    // Mock para la exploración (primera llamada) y generación (segunda)
    mockGenerateText
      .mockResolvedValueOnce({
        text: 'Exploración.',
        usage: { totalTokens: 20 },
        steps: [{ toolCalls: [] }],
      })
      .mockResolvedValueOnce({
        text: '## Plan',
        usage: { totalTokens: 30 },
        steps: [],
      });

    await debugAgent.investigate('Test', 'Test');

    expect(debugLogger.debug).toHaveBeenCalled();
  });
});
