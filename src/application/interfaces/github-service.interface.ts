export type ReactionContent = '+1' | '-1' | 'laugh' | 'confused' | 'heart' | 'hooray' | 'rocket' | 'eyes';

export interface CompareCommitsFile {
  filename: string;
  status: 'added' | 'modified' | 'removed' | 'renamed' | 'copied' | 'changed' | 'unchanged';
  additions: number;
  deletions: number;
  patch?: string;
}

export interface CompareCommitsResult {
  files: CompareCommitsFile[];
  summary: string;
  aheadBy: number;
}

export interface IGitHubService {
  createComment(owner: string, repo: string, issueNumber: number, body: string): Promise<{ id: number }>;
  updateComment(owner: string, repo: string, commentId: number, body: string): Promise<void>;
  replyToComment(owner: string, repo: string, commentId: number, body: string): Promise<void>;
  reactToIssue(owner: string, repo: string, issueNumber: number, reaction: ReactionContent): Promise<void>;
  reactToComment(owner: string, repo: string, commentId: number, reaction: ReactionContent): Promise<void>;
  addLabel(owner: string, repo: string, issueNumber: number, label: string): Promise<void>;
  removeLabel(owner: string, repo: string, issueNumber: number, label: string): Promise<void>;
  getIssue(owner: string, repo: string, issueNumber: number): Promise<{ title: string; body: string; labels: string[] }>;
  getIssueComments(
    owner: string,
    repo: string,
    issueNumber: number
  ): Promise<Array<{ id: number; body: string }>>;
  compareCommits(owner: string, repo: string, base: string, head: string): Promise<CompareCommitsResult>;
}
