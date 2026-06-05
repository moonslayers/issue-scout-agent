import { GitHubServiceAdapter } from '../../../src/infrastructure/github/github-service.adapter';

// Mock de Octokit
const mockCreateComment = jest.fn();
const mockUpdateComment = jest.fn();
const mockCreateReaction = jest.fn();
const mockCreateCommentReaction = jest.fn();
const mockAddLabels = jest.fn();
const mockRemoveLabel = jest.fn();
const mockGetIssue = jest.fn();

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    issues: {
      createComment: mockCreateComment,
      updateComment: mockUpdateComment,
      get: mockGetIssue,
      addLabels: mockAddLabels,
      removeLabel: mockRemoveLabel,
    },
    reactions: {
      createForIssue: mockCreateReaction,
      createForIssueComment: mockCreateCommentReaction,
    },
  })),
}));

describe('GitHubServiceAdapter', () => {
  let adapter: GitHubServiceAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new GitHubServiceAdapter('test-token', mockLogger);
  });

  describe('createComment', () => {
    it('should call Octokit issues.createComment', async () => {
      mockCreateComment.mockResolvedValue({ data: { id: 123 } });

      const result = await adapter.createComment('owner', 'repo', 1, 'Test plan');

      expect(mockCreateComment).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'owner',
          repo: 'repo',
          issue_number: 1,
          body: expect.stringContaining('Plan Técnico'),
        })
      );
      expect(result.id).toBe(123);
    });
  });

  describe('updateComment', () => {
    it('should call Octokit issues.updateComment', async () => {
      mockUpdateComment.mockResolvedValue({});

      await adapter.updateComment('owner', 'repo', 456, 'Updated plan');

      expect(mockUpdateComment).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'owner',
          repo: 'repo',
          comment_id: 456,
          body: expect.stringContaining('Plan Técnico'),
        })
      );
    });
  });

  describe('reactToIssue', () => {
    it('should call Octokit reactions.createForIssue', async () => {
      mockCreateReaction.mockResolvedValue({});

      await adapter.reactToIssue('owner', 'repo', 1, 'rocket');

      expect(mockCreateReaction).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        issue_number: 1,
        content: 'rocket',
      });
    });

    it('should not throw on reaction error', async () => {
      mockCreateReaction.mockRejectedValue(new Error('API error'));

      await expect(
        adapter.reactToIssue('owner', 'repo', 1, 'rocket')
      ).resolves.not.toThrow();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No se pudo reaccionar al issue',
        expect.objectContaining({
          issueNumber: 1,
          reaction: 'rocket',
          error: 'API error',
        })
      );
    });
  });

  describe('reactToComment', () => {
    it('should call Octokit reactions.createForIssueComment', async () => {
      mockCreateCommentReaction.mockResolvedValue({});

      await adapter.reactToComment('owner', 'repo', 789, 'eyes');

      expect(mockCreateCommentReaction).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        comment_id: 789,
        content: 'eyes',
      });
    });
  });

  describe('addLabel', () => {
    it('should call Octokit issues.addLabels', async () => {
      mockAddLabels.mockResolvedValue({});

      await adapter.addLabel('owner', 'repo', 1, 'scout-investigated');

      expect(mockAddLabels).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        issue_number: 1,
        labels: ['scout-investigated'],
      });
    });
  });

  describe('removeLabel', () => {
    it('should call Octokit issues.removeLabel', async () => {
      mockRemoveLabel.mockResolvedValue({});

      await adapter.removeLabel('owner', 'repo', 1, 'old-label');

      expect(mockRemoveLabel).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        issue_number: 1,
        name: 'old-label',
      });
    });
  });

  describe('getIssue', () => {
    it('should return issue data', async () => {
      mockGetIssue.mockResolvedValue({
        data: {
          title: 'Test Issue',
          body: 'Issue body',
          labels: [{ name: 'bug' }, { name: 'urgent' }],
        },
      });

      const result = await adapter.getIssue('owner', 'repo', 1);

      expect(result.title).toBe('Test Issue');
      expect(result.body).toBe('Issue body');
      expect(result.labels).toEqual(['bug', 'urgent']);
    });
  });
});
