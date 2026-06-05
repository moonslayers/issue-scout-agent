import { HandleCommandUseCase } from '../../src/application/use-cases/handle-command.use-case';
import { AgentService } from '../../src/application/services/agent.service';
import { IGitHubService } from '../../src/application/interfaces/github-service.interface';
import { ILogger } from '../../src/shared/logger/logger.interface';

// Mocks
const mockAgentService = {
  investigate: jest.fn(),
  handleCommand: jest.fn(),
} as unknown as jest.Mocked<AgentService>;

const mockGitHubService: jest.Mocked<IGitHubService> = {
  createComment: jest.fn(),
  updateComment: jest.fn(),
  replyToComment: jest.fn(),
  reactToIssue: jest.fn(),
  reactToComment: jest.fn(),
  addLabel: jest.fn(),
  removeLabel: jest.fn(),
  getIssue: jest.fn(),
  getIssueComments: jest.fn(),
};

const mockLogger: ILogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

describe('HandleCommandUseCase Integration', () => {
  let useCase: HandleCommandUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new HandleCommandUseCase(
      mockAgentService as unknown as AgentService,
      mockGitHubService,
      mockLogger
    );
  });

  describe('/update command', () => {
    it('should react to comment, update plan, and add label', async () => {
      mockAgentService.handleCommand.mockResolvedValue({
        response: 'Updated plan analysis',
        wasUpdate: true,
      });
      mockGitHubService.getIssueComments.mockResolvedValue([
        { id: 42, body: '<!-- scout:plan -->\n## 🤖 Plan Técnico Generado por Issue Scout\n\nSome previous plan...' },
      ]);

      await useCase.execute(
        'owner',
        'repo',
        1,
        '/update',
        'Issue title',
        'Issue description',
        100
      );

      // 1. Debe reaccionar al comentario
      expect(mockGitHubService.reactToComment).toHaveBeenCalledWith(
        'owner', 'repo', 100, 'eyes'
      );

      // 2. Debe ejecutar el agente
      expect(mockAgentService.handleCommand).toHaveBeenCalledWith(
        '/update', 'Issue title', 'Issue description'
      );

      // 3. Debe actualizar el comentario original del plan
      expect(mockGitHubService.updateComment).toHaveBeenCalledWith(
        'owner', 'repo', 42, 'Updated plan analysis'
      );

      // 4. Debe comentar confirmación
      expect(mockGitHubService.createComment).toHaveBeenCalledWith(
        'owner', 'repo', 1, expect.stringContaining('Plan actualizado')
      );

      // 5. Debe agregar label
      expect(mockGitHubService.addLabel).toHaveBeenCalledWith(
        'owner', 'repo', 1, 'plan-updated'
      );
    });

    it('should create new comment if no existing plan comment found', async () => {
      mockAgentService.handleCommand.mockResolvedValue({
        response: 'New plan',
        wasUpdate: true,
      });
      mockGitHubService.createComment.mockResolvedValue({ id: 999 });
      mockGitHubService.getIssueComments.mockResolvedValue([]);

      await useCase.execute(
        'owner', 'repo', 1, '/update', 'Title', 'Body', 100
      );

      // Debe crear nuevo comentario como plan
      expect(mockGitHubService.createComment).toHaveBeenCalled();
    });
  });

  describe('/ask command', () => {
    it('should react and reply with answer', async () => {
      mockAgentService.handleCommand.mockResolvedValue({
        response: 'Answer to the question',
        wasUpdate: false,
      });

      await useCase.execute(
        'owner', 'repo', 1, '/ask What is this?', 'Title', 'Body', 200
      );

      expect(mockGitHubService.reactToComment).toHaveBeenCalled();
      expect(mockGitHubService.createComment).toHaveBeenCalledWith(
        'owner', 'repo', 1, 'Answer to the question'
      );
    });
  });

  describe('/investigate command', () => {
    it('should react and update plan with investigation', async () => {
      mockAgentService.handleCommand.mockResolvedValue({
        response: 'Investigation results',
        wasUpdate: false,
      });
      mockGitHubService.getIssueComments.mockResolvedValue([
        { id: 42, body: '<!-- scout:plan -->\n## 🤖 Plan Técnico Generado por Issue Scout\n\nSome previous plan...' },
      ]);

      await useCase.execute(
        'owner', 'repo', 1, '/investigate user module', 'Title', 'Body', 300
      );

      expect(mockGitHubService.reactToComment).toHaveBeenCalled();
      expect(mockGitHubService.updateComment).toHaveBeenCalledWith(
        'owner', 'repo', 42, 'Investigation results'
      );
    });
  });

  describe('non-command comments', () => {
    it('should ignore regular comments', async () => {
      await useCase.execute(
        'owner', 'repo', 1, 'This is a regular comment', 'Title', 'Body', 400
      );

      expect(mockAgentService.handleCommand).not.toHaveBeenCalled();
      expect(mockGitHubService.createComment).not.toHaveBeenCalled();
    });
  });
});
