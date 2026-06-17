import { Command } from '../../domain/entities/command.entity';
import { IssueNumber } from '../../domain/value-objects/issue-number.vo';
import { AgentService } from '../services/agent.service';
import { IGitHubService, CompareCommitsResult } from '../interfaces/github-service.interface';
import { ILogger } from '../../shared/logger/logger.interface';
import { Templates, Labels } from '../../shared/templates/scout-templates';
import { GitInfoService } from '../../infrastructure/git/git-info.service';
import { PlanCommentParser } from '../../infrastructure/github/plan-comment-parser';

type ErrorWithCause = Error & { cause?: unknown };

export class HandleCommandUseCase {
  constructor(
    private readonly agentService: AgentService,
    private readonly githubService: IGitHubService,
    private readonly logger: ILogger,
    private readonly gitInfoService: GitInfoService,
    private readonly planCommentParser: PlanCommentParser
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

    // 2. Buscar plan comment existente
    const comments = await this.githubService.getIssueComments(owner, repo, issueNumber.getValue());
    const planComment = comments.find((c) => c.body.includes(Templates.PLAN.title));

    if (!planComment) {
      // No hay plan previo → crear desde cero (caso borde)
      this.logger.info('No existing plan found, creating new one');
      const result = await this.agentService.handleCommand('/update', issueTitle, issueBody);
      const currentHash = this.gitInfoService.getCurrentHeadHash();
      const fullPlan = this.planCommentParser.buildPlanWithTracker(result.response, currentHash, []);
      await this.githubService.createComment(owner, repo, issueNumber.getValue(), fullPlan);

      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await this.githubService.createComment(owner, repo, issueNumber.getValue(), Templates.UPDATE_CONFIRM.build(now));
      await this.githubService.addLabel(owner, repo, issueNumber.getValue(), Labels.PLAN_UPDATED);
      this.logger.info('New plan created via /update', { issueNumber: issueNumber.toString() });
      return;
    }

    // 3. Extraer version history del plan existente
    const versionHistory = this.planCommentParser.extractVersionHistory(planComment.body);

    if (versionHistory.length === 0) {
      // Plan legacy (sin version tracker) → full regeneration (backward compat)
      this.logger.info('Legacy plan without version tracker, falling back to full regeneration');
      const result = await this.agentService.handleCommand('/update', issueTitle, issueBody);
      const currentHash = this.gitInfoService.getCurrentHeadHash();
      const fullPlan = this.planCommentParser.buildPlanWithTracker(result.response, currentHash, []);
      await this.githubService.updateComment(owner, repo, planComment.id, fullPlan);

      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await this.githubService.createComment(owner, repo, issueNumber.getValue(), Templates.UPDATE_CONFIRM.build(now));
      await this.githubService.addLabel(owner, repo, issueNumber.getValue(), Labels.PLAN_UPDATED);
      this.logger.info('Legacy plan regenerated', { issueNumber: issueNumber.toString() });
      return;
    }

    // 4. Obtener HEAD actual
    let currentHash: string;
    try {
      currentHash = this.gitInfoService.getCurrentHeadHash();
    } catch (error) {
      this.logger.error('Failed to get current HEAD hash, falling back to full regeneration', { error });
      const result = await this.agentService.handleCommand('/update', issueTitle, issueBody);
      const fullPlan = this.planCommentParser.buildPlanWithTracker(result.response, 'unknown', versionHistory);
      await this.githubService.updateComment(owner, repo, planComment.id, fullPlan);

      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await this.githubService.createComment(owner, repo, issueNumber.getValue(), Templates.UPDATE_CONFIRM.build(now));
      await this.githubService.addLabel(owner, repo, issueNumber.getValue(), Labels.PLAN_UPDATED);
      return;
    }

    const latestStoredHash = versionHistory[0].commit; // newest first

    // 5. Comparar hashes — si son iguales, no hay cambios
    if (latestStoredHash === currentHash) {
      this.logger.info('No new commits since last plan update');
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await this.githubService.createComment(
        owner,
        repo,
        issueNumber.getValue(),
        Templates.UPDATE_NO_CHANGES.build(now)
      );
      return;
    }

    // 6. Obtener diff via GitHub API
    let diff: CompareCommitsResult;
    try {
      diff = await this.githubService.compareCommits(owner, repo, latestStoredHash, currentHash);
    } catch (error) {
      // Fallback: si la API falla, regeneración completa
      this.logger.warn('compareCommits failed, falling back to full regeneration', { error });
      const result = await this.agentService.handleCommand('/update', issueTitle, issueBody);
      const fullPlan = this.planCommentParser.buildPlanWithTracker(result.response, currentHash, versionHistory);
      await this.githubService.updateComment(owner, repo, planComment.id, fullPlan);

      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await this.githubService.createComment(owner, repo, issueNumber.getValue(), Templates.UPDATE_CONFIRM.build(now));
      await this.githubService.addLabel(owner, repo, issueNumber.getValue(), Labels.PLAN_UPDATED);
      return;
    }

    // 7. Si no hay archivos cambiados, no hay cambios relevantes
    if (diff.files.length === 0) {
      this.logger.info('No file changes detected in diff');
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await this.githubService.createComment(
        owner,
        repo,
        issueNumber.getValue(),
        Templates.UPDATE_NO_CHANGES.build(now)
      );
      return;
    }

    // 8. Extraer plan body original (sin template wrapper ni version tracker)
    const originalPlanBody = this.planCommentParser.extractPlanBody(planComment.body);

    // 9. Llamar AI para actualización incremental con diff
    this.logger.info('Calling AI for incremental plan update', {
      filesChanged: diff.files.length,
      aheadBy: diff.aheadBy,
    });

    // Filtrar comentarios para no incluir el plan comment ni el trigger comment
    const filteredComments = comments.filter(
      (c) => c.id !== planComment.id && c.body !== planComment.body
    );

    const updateResult = await this.agentService.updatePlanWithDiff(
      originalPlanBody,
      diff,
      issueTitle,
      issueBody,
      filteredComments
    );

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // 10. Si los cambios no son relevantes, informar y salir
    if (!updateResult.wasRelevant) {
      this.logger.info('Changes not relevant to plan', {
        message: updateResult.message,
      });
      await this.githubService.createComment(
        owner,
        repo,
        issueNumber.getValue(),
        Templates.UPDATE_NOT_RELEVANT.build(now, updateResult.message || 'Los cambios no afectan el plan actual.')
      );
      return;
    }

    // 11. Actualizar plan comment con nuevo version tracker
    const updatedFullPlan = this.planCommentParser.buildPlanWithTracker(
      updateResult.response,
      currentHash,
      versionHistory
    );
    await this.githubService.updateComment(owner, repo, planComment.id, updatedFullPlan);

    // 12. Publicar confirmación
    await this.githubService.createComment(
      owner,
      repo,
      issueNumber.getValue(),
      Templates.UPDATE_CONFIRM.build(now)
    );

    // 13. Agregar label de actualizado
    await this.githubService.addLabel(owner, repo, issueNumber.getValue(), Labels.PLAN_UPDATED);

    this.logger.info('Plan updated successfully via incremental diff', {
      issueNumber: issueNumber.toString(),
      fromCommit: latestStoredHash,
      toCommit: currentHash,
    });
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

    // Obtener todos los comentarios del issue para contexto
    const comments = await this.githubService.getIssueComments(owner, repo, issueNumber.getValue());

    // Buscar plan existente
    const planComment = comments.find((c) => c.body.includes(Templates.PLAN.title));
    const planBody = planComment ? this.planCommentParser.extractPlanBody(planComment.body) : undefined;

    // Procesar pregunta SIN exploración (solo contexto existente)
    const result = await this.agentService.handleAsk(
      args,
      issueTitle,
      issueBody,
      comments,
      planBody
    );

    // Responder con un nuevo comentario
    await this.githubService.createComment(
      owner,
      repo,
      issueNumber.getValue(),
      Templates.REPLY.build(result.response)
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
      await this.githubService.updateComment(owner, repo, planComment.id, Templates.PLAN.build(result.response));
    } else {
      await this.githubService.createComment(
        owner,
        repo,
        issueNumber.getValue(),
        Templates.PLAN.build(result.response)
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
