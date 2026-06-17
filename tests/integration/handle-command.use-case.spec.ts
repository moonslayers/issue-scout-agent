import { HandleCommandUseCase } from '../../src/application/use-cases/handle-command.use-case';
import { AgentService } from '../../src/application/services/agent.service';
import { IGitHubService } from '../../src/application/interfaces/github-service.interface';
import { ILogger } from '../../src/shared/logger/logger.interface';
import { Templates } from '../../src/shared/templates/scout-templates';
import { GitInfoService } from '../../src/infrastructure/git/git-info.service';
import { PlanCommentParser, VersionEntry } from '../../src/infrastructure/github/plan-comment-parser';

// --- MOCKS ---
const mockAgentService = {
  investigate: jest.fn(),
  handleCommand: jest.fn(),
  updatePlanWithDiff: jest.fn(),
  handleAsk: jest.fn(),
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
  compareCommits: jest.fn(),
};

const mockLogger: ILogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const mockGitInfoService = {
  getCurrentHeadHash: jest.fn(),
  fetchCommit: jest.fn(),
} as unknown as jest.Mocked<GitInfoService>;

// PlanCommentParser real (es puro, sin IO)
const planCommentParser = new PlanCommentParser();

// --- HELPERS ---
function createPlanBody(planText: string, commit: string, version: number, history: VersionEntry[] = []): string {
  return planCommentParser.buildPlanWithTracker(planText, commit, history);
}

// --- TESTS ---
describe('HandleCommandUseCase Integration', () => {
  let useCase: HandleCommandUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new HandleCommandUseCase(
      mockAgentService as unknown as AgentService,
      mockGitHubService,
      mockLogger,
      mockGitInfoService,
      planCommentParser
    );
  });

  describe('/update command', () => {
    it('should handle incremental update when changes are relevant', async () => {
      const oldCommit = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const newCommit = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const originalPlan = 'Some previous plan content';
      const updatedPlan = 'Updated plan content with relevant changes';

      mockGitHubService.getIssueComments.mockResolvedValue([
        { id: 42, body: createPlanBody(originalPlan, oldCommit, 1) },
      ]);
      mockGitInfoService.getCurrentHeadHash.mockReturnValue(newCommit);
      mockGitHubService.compareCommits.mockResolvedValue({
        files: [{ filename: 'src/foo.ts', status: 'modified', additions: 10, deletions: 2, patch: '@@ -1,5 +1,13 @@\n+new code' }],
        summary: '1 commit, 1 archivo cambiado',
        aheadBy: 1,
      });
      mockAgentService.updatePlanWithDiff.mockResolvedValue({
        response: updatedPlan,
        wasUpdate: true,
        wasRelevant: true,
      });
      mockGitHubService.createComment.mockResolvedValue({ id: 999 });

      await useCase.execute(
        'owner', 'repo', 1, '/update', 'Issue title', 'Issue description', 100
      );

      // Debe reaccionar al comentario
      expect(mockGitHubService.reactToComment).toHaveBeenCalledWith('owner', 'repo', 100, 'eyes');

      // Debe comparar commits
      expect(mockGitHubService.compareCommits).toHaveBeenCalledWith('owner', 'repo', oldCommit, newCommit);

      // Debe llamar a updatePlanWithDiff con el plan original + diff + comentarios filtrados
      expect(mockAgentService.updatePlanWithDiff).toHaveBeenCalledWith(
        originalPlan,
        expect.objectContaining({ files: expect.arrayContaining([expect.objectContaining({ filename: 'src/foo.ts' })]) }),
        'Issue title',
        'Issue description',
        []
      );

      // Debe actualizar el comentario del plan con el nuevo version tracker
      expect(mockGitHubService.updateComment).toHaveBeenCalledWith(
        'owner', 'repo', 42,
        expect.stringContaining(updatedPlan)
      );

      // Debe contener el nuevo commit hash en el tracker
      expect(mockGitHubService.updateComment).toHaveBeenCalledWith(
        'owner', 'repo', 42,
        expect.stringContaining(newCommit)
      );

      // Debe contener el commit previo en el histórico
      expect(mockGitHubService.updateComment).toHaveBeenCalledWith(
        'owner', 'repo', 42,
        expect.stringContaining(oldCommit)
      );

      // Debe comentar confirmación
      expect(mockGitHubService.createComment).toHaveBeenCalledWith(
        'owner', 'repo', 1, expect.stringContaining('actualizado')
      );

      // Debe agregar label
      expect(mockGitHubService.addLabel).toHaveBeenCalledWith('owner', 'repo', 1, 'plan-updated');
    });

    it('should not update plan when changes are not relevant', async () => {
      const oldCommit = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const newCommit = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

      mockGitHubService.getIssueComments.mockResolvedValue([
        { id: 42, body: createPlanBody('Plan content', oldCommit, 1) },
      ]);
      mockGitInfoService.getCurrentHeadHash.mockReturnValue(newCommit);
      mockGitHubService.compareCommits.mockResolvedValue({
        files: [{ filename: 'src/docs.md', status: 'modified', additions: 5, deletions: 3 }],
        summary: '1 commit, 1 archivo cambiado',
        aheadBy: 1,
      });
      mockAgentService.updatePlanWithDiff.mockResolvedValue({
        response: '',
        wasUpdate: false,
        wasRelevant: false,
        message: 'Los cambios son solo en documentación, no afectan el plan.',
      });
      mockGitHubService.createComment.mockResolvedValue({ id: 999 });

      await useCase.execute(
        'owner', 'repo', 1, '/update', 'Title', 'Body', 100
      );

      // No debe actualizar el plan comment
      expect(mockGitHubService.updateComment).not.toHaveBeenCalled();

      // Debe informar que los cambios no son relevantes
      expect(mockGitHubService.createComment).toHaveBeenCalledWith(
        'owner', 'repo', 1,
        expect.stringContaining('no afectan el plan')
      );

      // No debe agregar label (solo se agrega cuando hay update real)
    });

    it('should post no-changes message when commit hash is the same', async () => {
      const sameCommit = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

      mockGitHubService.getIssueComments.mockResolvedValue([
        { id: 42, body: createPlanBody('Plan content', sameCommit, 1) },
      ]);
      mockGitInfoService.getCurrentHeadHash.mockReturnValue(sameCommit);
      mockGitHubService.createComment.mockResolvedValue({ id: 999 });

      await useCase.execute(
        'owner', 'repo', 1, '/update', 'Title', 'Body', 100
      );

      // No debe llamar al AI ni comparar commits ni actualizar el plan
      expect(mockGitHubService.compareCommits).not.toHaveBeenCalled();
      expect(mockAgentService.updatePlanWithDiff).not.toHaveBeenCalled();
      expect(mockAgentService.handleCommand).not.toHaveBeenCalled();
      expect(mockGitHubService.updateComment).not.toHaveBeenCalled();

      // Debe informar que no hay cambios
      expect(mockGitHubService.createComment).toHaveBeenCalledWith(
        'owner', 'repo', 1,
        expect.stringContaining('No se detectaron cambios')
      );
    });

    it('should fall back to full regeneration for legacy plan (no version tracker)', async () => {
      mockGitHubService.getIssueComments.mockResolvedValue([
        { id: 42, body: '<!-- scout:plan -->\nOld legacy plan without tracker' },
      ]);
      mockAgentService.handleCommand.mockResolvedValue({
        response: 'New regenerated plan',
        wasUpdate: true,
      });
      mockGitInfoService.getCurrentHeadHash.mockReturnValue('cccccccccccccccccccccccccccccccccccccccc');
      mockGitHubService.createComment.mockResolvedValue({ id: 999 });

      await useCase.execute(
        'owner', 'repo', 1, '/update', 'Title', 'Body', 100
      );

      // Debe usar handleCommand (full regeneration) en lugar de updatePlanWithDiff
      expect(mockAgentService.handleCommand).toHaveBeenCalledWith('/update', 'Title', 'Body');
      expect(mockAgentService.updatePlanWithDiff).not.toHaveBeenCalled();
      expect(mockGitHubService.updateComment).toHaveBeenCalled();

      // El nuevo plan debe tener version tracker
      expect(mockGitHubService.updateComment).toHaveBeenCalledWith(
        'owner', 'repo', 42,
        expect.stringContaining('🕵️')
      );
    });

    it('should create new plan comment if no existing plan found', async () => {
      mockGitHubService.getIssueComments.mockResolvedValue([]);
      mockAgentService.handleCommand.mockResolvedValue({
        response: 'New plan',
        wasUpdate: true,
      });
      mockGitInfoService.getCurrentHeadHash.mockReturnValue('dddddddddddddddddddddddddddddddddddddddd');
      mockGitHubService.createComment.mockResolvedValue({ id: 999 });

      await useCase.execute(
        'owner', 'repo', 1, '/update', 'Title', 'Body', 100
      );

      // Debe crear un nuevo comentario (no actualizar)
      expect(mockGitHubService.createComment).toHaveBeenCalledWith(
        'owner', 'repo', 1,
        expect.stringContaining('🕵️')
      );
      expect(mockGitHubService.updateComment).not.toHaveBeenCalled();
    });

    it('should react to the trigger comment', async () => {
      const commit = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      mockGitHubService.getIssueComments.mockResolvedValue([
        { id: 42, body: createPlanBody('Plan', commit, 1) },
      ]);
      mockGitInfoService.getCurrentHeadHash.mockReturnValue(commit); // mismo commit → no changes, shortcut
      mockGitHubService.createComment.mockResolvedValue({ id: 999 });

      await useCase.execute(
        'owner', 'repo', 1, '/update', 'Title', 'Body', 100
      );

      // Siempre debe reaccionar al trigger comment
      expect(mockGitHubService.reactToComment).toHaveBeenCalledWith('owner', 'repo', 100, 'eyes');
    });
  });

  describe('/ask command', () => {
    it('should react and reply with answer', async () => {
      mockGitHubService.getIssueComments.mockResolvedValue([
        { id: 10, body: 'Comentario general' },
        { id: 20, body: `<!-- scout:plan -->\n## 🤖 Plan Técnico Generado por Issue Scout\n\nExisting plan content\n---\n*🕵️ Generado por [Issue Scout Agent](https://github.com/moonslayers/issue-scout-agent)*` },
      ]);
      mockAgentService.handleAsk.mockResolvedValue({
        response: 'Answer to the question',
      });

      await useCase.execute('owner', 'repo', 1, '/ask What is this?', 'Title', 'Body', 200);

      expect(mockGitHubService.reactToComment).toHaveBeenCalled();
      expect(mockAgentService.handleAsk).toHaveBeenCalledWith(
        'What is this?',
        'Title',
        'Body',
        expect.arrayContaining([
          expect.objectContaining({ id: 10 }),
          expect.objectContaining({ id: 20 }),
        ]),
        expect.stringContaining('Existing plan content')
      );
      expect(mockGitHubService.createComment).toHaveBeenCalledWith(
        'owner', 'repo', 1, Templates.REPLY.build('Answer to the question')
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

      await useCase.execute('owner', 'repo', 1, '/investigate user module', 'Title', 'Body', 300);

      expect(mockGitHubService.reactToComment).toHaveBeenCalled();
      expect(mockGitHubService.updateComment).toHaveBeenCalledWith(
        'owner', 'repo', 42, Templates.PLAN.build('Investigation results')
      );
    });
  });

  describe('non-command comments', () => {
    it('should ignore regular comments', async () => {
      await useCase.execute('owner', 'repo', 1, 'This is a regular comment', 'Title', 'Body', 400);

      expect(mockAgentService.handleCommand).not.toHaveBeenCalled();
      expect(mockGitHubService.createComment).not.toHaveBeenCalled();
    });
  });
});
