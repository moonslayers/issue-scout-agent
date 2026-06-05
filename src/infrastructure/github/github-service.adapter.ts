import { Octokit } from '@octokit/rest';
import { IGitHubService, ReactionContent } from '../../application/interfaces/github-service.interface';
import { ILogger } from '../../shared/logger/logger.interface';
import { Templates } from '../../shared/templates/scout-templates';

export class GitHubServiceAdapter implements IGitHubService {
  private readonly octokit: Octokit;

  constructor(
    private readonly token: string,
    private readonly logger: ILogger
  ) {
    this.octokit = new Octokit({ auth: token });
  }

  async createComment(
    owner: string,
    repo: string,
    issueNumber: number,
    body: string
  ): Promise<{ id: number }> {
    const { data } = await this.octokit.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body: body,
    });
    return { id: data.id };
  }

  async updateComment(
    owner: string,
    repo: string,
    commentId: number,
    body: string
  ): Promise<void> {
    await this.octokit.issues.updateComment({
      owner,
      repo,
      comment_id: commentId,
      body: body,
    });
  }

  async replyToComment(
    _owner: string,
    _repo: string,
    commentId: number,
    body: string
  ): Promise<void> {
    await this.octokit.issues.createComment({
      owner: _owner,
      repo: _repo,
      issue_number: commentId,
      body: Templates.REPLY.build(body),
    });
  }

  async reactToIssue(
    owner: string,
    repo: string,
    issueNumber: number,
    reaction: ReactionContent
  ): Promise<void> {
    try {
      await this.octokit.reactions.createForIssue({
        owner,
        repo,
        issue_number: issueNumber,
        content: reaction,
      });
    } catch (error) {
      this.logger.warn('No se pudo reaccionar al issue', {
        issueNumber,
        reaction,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async reactToComment(
    owner: string,
    repo: string,
    commentId: number,
    reaction: ReactionContent
  ): Promise<void> {
    try {
      await this.octokit.reactions.createForIssueComment({
        owner,
        repo,
        comment_id: commentId,
        content: reaction,
      });
    } catch (error) {
      this.logger.warn('No se pudo reaccionar al comentario', {
        commentId,
        reaction,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async addLabel(
    owner: string,
    repo: string,
    issueNumber: number,
    label: string
  ): Promise<void> {
    try {
      await this.octokit.issues.addLabels({
        owner,
        repo,
        issue_number: issueNumber,
        labels: [label],
      });
    } catch (error) {
      this.logger.warn('No se pudo agregar label', {
        issueNumber,
        label,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async removeLabel(
    owner: string,
    repo: string,
    issueNumber: number,
    label: string
  ): Promise<void> {
    try {
      await this.octokit.issues.removeLabel({
        owner,
        repo,
        issue_number: issueNumber,
        name: label,
      });
    } catch (error) {
      this.logger.warn('No se pudo remover label', {
        issueNumber,
        label,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async getIssue(
    owner: string,
    repo: string,
    issueNumber: number
  ): Promise<{ title: string; body: string; labels: string[] }> {
    const { data } = await this.octokit.issues.get({
      owner,
      repo,
      issue_number: issueNumber,
    });
    return {
      title: data.title,
      body: data.body || '',
      labels: data.labels.map((l: string | { name?: string }) => typeof l === 'string' ? l : l.name || ''),
    };
  }

  async getIssueComments(
    owner: string,
    repo: string,
    issueNumber: number
  ): Promise<Array<{ id: number; body: string }>> {
    const { data } = await this.octokit.issues.listComments({
      owner,
      repo,
      issue_number: issueNumber,
    });
    return data.map(comment => ({
      id: comment.id,
      body: comment.body || '',
    }));
  }
}
