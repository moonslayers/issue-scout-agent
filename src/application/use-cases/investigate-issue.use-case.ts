import { IssueNumber } from '../../domain/value-objects/issue-number.vo';
import { AgentService } from '../services/agent.service';
import { IGitHubService } from '../interfaces/github-service.interface';
import { ILogger } from '../../shared/logger/logger.interface';
import { EnvConfig } from '../../shared/config/environment.config';
import { Templates, Labels } from '../../shared/templates/scout-templates';

type ErrorWithCause = Error & { cause?: unknown };

export class InvestigateIssueUseCase {
  constructor(
    private readonly agentService: AgentService,
    private readonly githubService: IGitHubService,
    private readonly logger: ILogger,
    private readonly config: EnvConfig
  ) {}

  async execute(
    owner: string,
    repo: string,
    issueNumberValue: number,
    title: string,
    body: string
  ): Promise<void> {
    const issueNumber = new IssueNumber(issueNumberValue);
    this.logger.info('Investigating issue', { issueNumber: issueNumber.toString(), title });

    try {
      // Reaccionar al issue para indicar que empezamos
      await this.githubService.reactToIssue(owner, repo, issueNumber.getValue(), 'eyes');

      // Ejecutar agente
      const plan = await this.agentService.investigate(title, body);

      // Publicar comentario con el plan
      const comment = await this.githubService.createComment(
        owner,
        repo,
        issueNumber.getValue(),
        Templates.PLAN.build(plan)
      );

      // Agregar label de investigado
      await this.githubService.addLabel(owner, repo, issueNumber.getValue(), Labels.SCOUT_INVESTIGATED);

      this.logger.info('Issue investigation completed', {
        issueNumber: issueNumber.toString(),
        commentId: comment.id,
      });
    } catch (error) {
      this.logger.error('Investigation failed', {
        issueNumber: issueNumber.toString(),
        title,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        cause: error instanceof Error ? JSON.stringify((error as ErrorWithCause).cause) : undefined,
      });

      // Publicar error como comentario
      await this.githubService.createComment(
        owner,
        repo,
        issueNumber.getValue(),
        Templates.ERROR_INVESTIGATION.build(error instanceof Error ? error.message : 'Error desconocido')
      );

      throw error;
    }
  }
}
