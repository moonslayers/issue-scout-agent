import { Octokit } from '@octokit/rest';
import { IGitHubService } from '../../application/interfaces/github-service.interface';

export class GitHubServiceAdapter implements IGitHubService {
  private readonly octokit: Octokit;

  constructor(token: string) {
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
      body: this.wrapPlan(body),
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
      body: this.wrapPlan(body),
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
      body: `## 🤖 Respuesta de Issue Scout\n\n${body}`,
    });
  }

  async reactToIssue(
    owner: string,
    repo: string,
    issueNumber: number,
    reaction: string
  ): Promise<void> {
    try {
      await this.octokit.reactions.createForIssue({
        owner,
        repo,
        issue_number: issueNumber,
        content: reaction as any,
      });
    } catch (error) {
      console.warn(`No se pudo reaccionar al issue: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async reactToComment(
    owner: string,
    repo: string,
    commentId: number,
    reaction: string
  ): Promise<void> {
    try {
      await this.octokit.reactions.createForIssueComment({
        owner,
        repo,
        comment_id: commentId,
        content: reaction as any,
      });
    } catch (error) {
      console.warn(`No se pudo reaccionar al comentario: ${error instanceof Error ? error.message : String(error)}`);
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
      console.warn(`No se pudo agregar label: ${error instanceof Error ? error.message : String(error)}`);
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
      console.warn(`No se pudo remover label: ${error instanceof Error ? error.message : String(error)}`);
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

  private wrapPlan(body: string): string {
    return `## 🤖 Plan Técnico Generado por Issue Scout\n\n${body}\n\n---\n*Este plan es orientativo. Verifica rutas y nombres de archivos antes de implementar.*`;
  }
}
