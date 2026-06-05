import { Command } from '../../domain/entities/command.entity';
import { IssueNumber } from '../../domain/value-objects/issue-number.vo';
import { AgentService } from '../services/agent.service';
import { IGitHubService } from '../interfaces/github-service.interface';
import { ILogger } from '../../shared/logger/logger.interface';
import { Templates, Labels } from '../../shared/templates/scout-templates';

type ErrorWithCause = Error & { cause?: unknown };

export class HandleCommandUseCase {
  constructor(
    private readonly agentService: AgentService,
    private readonly githubService: IGitHubService,
    private readonly logger: ILogger
  ) {}

  async execute(
    owner: string,
    repo: string,
    issueNumberValue: number,
    commentBody: string,
    issueTitle: string,
    issueBody: string,
    commentId: number
  ): Promise<void> {
    const issueNumber = new IssueNumber(issueNumberValue);

    // Parsear comando
    const command = Command.parse(commentBody);
    if (!command) {
      this.logger.info('Not a valid command, ignoring');
      return;
    }

    this.logger.info('Processing command', {
      command: command.type,
      issueNumber: issueNumber.toString(),
    });

    try {
      if (command.isUpdateCommand()) {
        await this.handleUpdate(owner, repo, issueNumber, issueTitle, issueBody, commentId);
      } else if (command.isAskCommand()) {
        await this.handleAsk(owner, repo, issueNumber, issueTitle, issueBody, commentId, command.args);
      } else if (command.isInvestigateCommand()) {
        await this.handleInvestigate(owner, repo, issueNumber, issueTitle, issueBody, commentId, command.args);
      }
    } catch (error) {
      this.logger.error('Command handling failed', {
        command: command.type,
        issueNumber: issueNumber.toString(),
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        cause: error instanceof Error ? JSON.stringify((error as ErrorWithCause).cause) : undefined,
      });

      await this.githubService.createComment(
        owner,
        repo,
        issueNumber.getValue(),
        Templates.ERROR_COMMAND.build(command.type, error instanceof Error ? error.message : 'Error desconocido')
      );
    }
  }

  private async handleUpdate(
    owner: string,
    repo: string,
    issueNumber: IssueNumber,
    issueTitle: string,
    issueBody: string,
    triggerCommentId: number
  ): Promise<void> {
    this.logger.info('Handling /update command');

    // 1. Reaccionar con 👀 al comentario que activó el update
    await this.githubService.reactToComment(owner, repo, triggerCommentId, 'eyes');

    // 2. Re-ejecutar investigación
    const updatedPlan = await this.agentService.handleCommand('/update', issueTitle, issueBody);

    // 3. Buscar el plan comment existente y actualizarlo
    const comments = await this.githubService.getIssueComments(owner, repo, issueNumber.getValue());
    const planComment = comments.find(c => c.body.includes(Templates.PLAN.title));

    if (planComment) {
      await this.githubService.updateComment(owner, repo, planComment.id, updatedPlan.response);
    } else {
      await this.githubService.createComment(
        owner,
        repo,
        issueNumber.getValue(),
        updatedPlan.response
      );
    }

    // 4. Comentar confirmación
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    await this.githubService.createComment(
      owner,
      repo,
      issueNumber.getValue(),
      Templates.UPDATE_CONFIRM.build(now)
    );

    // 5. Agregar label de actualizado
    await this.githubService.addLabel(owner, repo, issueNumber.getValue(), Labels.PLAN_UPDATED);

    this.logger.info('Plan updated successfully', { issueNumber: issueNumber.toString() });
  }

  private async handleAsk(
    owner: string,
    repo: string,
    issueNumber: IssueNumber,
    issueTitle: string,
    issueBody: string,
    triggerCommentId: number,
    args: string
  ): Promise<void> {
    this.logger.info('Handling /ask command', { args });

    // Reaccionar al comentario
    await this.githubService.reactToComment(owner, repo, triggerCommentId, 'eyes');

    // Procesar pregunta
    const result = await this.agentService.handleCommand(`/ask ${args}`, issueTitle, issueBody);

    // Responder con un nuevo comentario
    await this.githubService.createComment(
      owner,
      repo,
      issueNumber.getValue(),
      result.response
    );
  }

  private async handleInvestigate(
    owner: string,
    repo: string,
    issueNumber: IssueNumber,
    issueTitle: string,
    issueBody: string,
    triggerCommentId: number,
    args: string
  ): Promise<void> {
    this.logger.info('Handling /investigate command', { args });

    // Reaccionar al comentario
    await this.githubService.reactToComment(owner, repo, triggerCommentId, 'eyes');

    // Investigar componente específico
    const result = await this.agentService.handleCommand(`/investigate ${args}`, issueTitle, issueBody);

    // Buscar el plan comment existente y actualizarlo
    const comments = await this.githubService.getIssueComments(owner, repo, issueNumber.getValue());
    const planComment = comments.find(c => c.body.includes(Templates.PLAN.title));

    if (planComment) {
      await this.githubService.updateComment(owner, repo, planComment.id, result.response);
    } else {
      await this.githubService.createComment(
        owner,
        repo,
        issueNumber.getValue(),
        result.response
      );
    }

    await this.githubService.createComment(
      owner,
      repo,
      issueNumber.getValue(),
      Templates.INVESTIGATE_CONFIRM.build(args)
    );
  }
}
