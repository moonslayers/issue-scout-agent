import { Command } from '../../domain/entities/command.entity';
import { IssueNumber } from '../../domain/value-objects/issue-number.vo';
import { AgentService } from '../services/agent.service';
import { IGitHubService } from '../interfaces/github-service.interface';
import { ILogger } from '../../shared/logger/logger.interface';

export class HandleCommandUseCase {
  private storedPlanCommentId: number | null = null;

  constructor(
    private readonly agentService: AgentService,
    private readonly githubService: IGitHubService,
    private readonly logger: ILogger
  ) {}

  /**
   * Almacena el ID del comentario del plan para que /update pueda modificarlo.
   */
  setPlanCommentId(commentId: number | null): void {
    this.storedPlanCommentId = commentId;
  }

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
        error: error instanceof Error ? error.message : String(error),
      });

      await this.githubService.createComment(
        owner,
        repo,
        issueNumber.getValue(),
        `❌ **Error al procesar el comando \`${command.type}\`:**\n\n${error instanceof Error ? error.message : 'Error desconocido'}`
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

    // 3. Si tenemos el ID del comentario original, actualizarlo
    if (this.storedPlanCommentId) {
      await this.githubService.updateComment(owner, repo, this.storedPlanCommentId, updatedPlan.response);
    } else {
      // Si no tenemos el ID (por ejemplo, el plan original se perdió), crear nuevo comentario
      const newComment = await this.githubService.createComment(
        owner,
        repo,
        issueNumber.getValue(),
        updatedPlan.response
      );
      this.storedPlanCommentId = newComment.id;
    }

    // 4. Comentar confirmación
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    await this.githubService.createComment(
      owner,
      repo,
      issueNumber.getValue(),
      `✅ **Plan actualizado** — ${now} UTC\n\nEl plan ha sido re-generado con el código más reciente del repositorio.`
    );

    // 5. Agregar label de actualizado
    await this.githubService.addLabel(owner, repo, issueNumber.getValue(), 'plan-updated');

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

    // Actualizar el plan original
    if (this.storedPlanCommentId) {
      await this.githubService.updateComment(owner, repo, this.storedPlanCommentId, result.response);
    } else {
      const newComment = await this.githubService.createComment(
        owner,
        repo,
        issueNumber.getValue(),
        result.response
      );
      this.storedPlanCommentId = newComment.id;
    }

    await this.githubService.createComment(
      owner,
      repo,
      issueNumber.getValue(),
      `✅ **Investigación actualizada** con el análisis de "${args}".`
    );
  }
}
