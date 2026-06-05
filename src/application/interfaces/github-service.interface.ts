export interface IGitHubService {
  createComment(owner: string, repo: string, issueNumber: number, body: string): Promise<{ id: number }>;
  updateComment(owner: string, repo: string, commentId: number, body: string): Promise<void>;
  replyToComment(owner: string, repo: string, commentId: number, body: string): Promise<void>;
  reactToIssue(owner: string, repo: string, issueNumber: number, reaction: string): Promise<void>;
  reactToComment(owner: string, repo: string, commentId: number, reaction: string): Promise<void>;
  addLabel(owner: string, repo: string, issueNumber: number, label: string): Promise<void>;
  removeLabel(owner: string, repo: string, issueNumber: number, label: string): Promise<void>;
  getIssue(owner: string, repo: string, issueNumber: number): Promise<{ title: string; body: string; labels: string[] }>;
  getIssueComments(
    owner: string,
    repo: string,
    issueNumber: number
  ): Promise<Array<{ id: number; body: string }>>;
}
