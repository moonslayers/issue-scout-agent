import * as core from '@actions/core';
import * as github from '@actions/github';
import { loadConfig } from '../../shared/config/environment.config';
import { ConsoleLogger } from '../../shared/logger/console-logger.adapter';
import { AgentService } from '../../application/services/agent.service';
import { GitHubServiceAdapter } from '../../infrastructure/github/github-service.adapter';
import { InvestigateIssueUseCase } from '../../application/use-cases/investigate-issue.use-case';
import { HandleCommandUseCase } from '../../application/use-cases/handle-command.use-case';

async function run(): Promise<void> {
  // Cargar configuración
  const config = loadConfig();
  const logger = new ConsoleLogger(config);

  logger.info('🚀 Issue Scout Agent starting...', {
    provider: config.AI_PROVIDER,
    model: config.AI_MODEL,
    event: github.context.eventName,
    action: github.context.payload.action,
  });

  // Inicializar servicios
  const agentService = new AgentService(config, logger);
  const githubService = new GitHubServiceAdapter(config.GITHUB_TOKEN);

  // Inicializar casos de uso (comparten el planCommentId a través del HandleCommandUseCase)
  const handleCommandUseCase = new HandleCommandUseCase(
    agentService,
    githubService,
    logger
  );
  const investigateUseCase = new InvestigateIssueUseCase(
    agentService,
    githubService,
    logger,
    config
  );

  const context = github.context;
  const payload = context.payload;
  const { owner, repo } = context.repo;

  try {
    // ============================================
    // EVENTO: Issue abierto
    // ============================================
    if (context.eventName === 'issues' && payload.action === 'opened') {
      const issue = payload.issue!;
      const issueNumber = issue.number;
      const title = issue.title;
      const body = issue.body || '';

      logger.info('📝 New issue detected', { issueNumber, title });

      await investigateUseCase.execute(owner, repo, issueNumber, title, body);

      // Compartir el ID del comentario del plan con el command handler
      const planCommentId = investigateUseCase.getLastPlanCommentId();
      if (planCommentId) {
        handleCommandUseCase.setPlanCommentId(planCommentId);
      }
    }

    // ============================================
    // EVENTO: Comentario en issue
    // ============================================
    else if (context.eventName === 'issue_comment' && payload.action === 'created') {
      const comment = payload.comment!;
      const issue = payload.issue!;
      const commentBody = comment.body || '';
      const issueNumber = issue.number;
      const issueTitle = issue.title;
      const issueBody = issue.body || '';
      const commentId = comment.id;

      // Verificar si el comentario es un comando
      if (!commentBody.startsWith('/')) {
        logger.info('Comment is not a command, ignoring');
        return;
      }

      logger.info('💬 Command detected', {
        issueNumber,
        commentId,
        commandPreview: commentBody.substring(0, 50),
      });

      // Compartir el planCommentId si existe de una ejecución anterior
      const previousPlanId = investigateUseCase.getLastPlanCommentId();
      if (previousPlanId) {
        handleCommandUseCase.setPlanCommentId(previousPlanId);
      }

      await handleCommandUseCase.execute(
        owner,
        repo,
        issueNumber,
        commentBody,
        issueTitle,
        issueBody,
        commentId
      );
    }

    // ============================================
    // OTROS EVENTOS
    // ============================================
    else {
      logger.info('Event not handled, skipping', {
        event: context.eventName,
        action: payload.action,
      });
    }

    logger.info('✅ Issue Scout Agent completed successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('💥 Fatal error', { error: errorMessage });
    core.setFailed(`Issue Scout Agent failed: ${errorMessage}`);
  }
}

run();
