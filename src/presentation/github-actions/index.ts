import * as core from '@actions/core';
import * as github from '@actions/github';
import { loadConfig } from '../../shared/config/environment.config';
import { ConsoleLogger } from '../../shared/logger/console-logger.adapter';
import { AgentService } from '../../application/services/agent.service';
import { GitHubServiceAdapter } from '../../infrastructure/github/github-service.adapter';
import { InvestigateIssueUseCase } from '../../application/use-cases/investigate-issue.use-case';
import { HandleCommandUseCase } from '../../application/use-cases/handle-command.use-case';
import fs from 'fs';

async function run(): Promise<void> {
  // Pasar inputs de GitHub Actions a loadConfig como overrides
  // para que Zod validation los lea sin mutar process.env
  const config = loadConfig({
    // Required
    AI_API_KEY: core.getInput('ai_api_key', { required: true }),
    AI_MODEL: core.getInput('ai_model', { required: true }),

    // GitHub token (default: ${{ github.token }})
    GITHUB_TOKEN: core.getInput('github_token'),

    // Owner/Repo from context (GITHUB_REPOSITORY_NAME no es estándar como env var)
    GITHUB_REPOSITORY_OWNER: github.context.repo.owner,
    GITHUB_REPOSITORY_NAME: github.context.repo.repo,

    // Optional with defaults in action.yml
    AI_PROVIDER: core.getInput('ai_provider'),
    AI_TEMPERATURE: core.getInput('ai_temperature'),
    AI_TIMEOUT: core.getInput('ai_timeout'),
    LOG_LEVEL: core.getInput('log_level'),

    // Optional without defaults (empty string → undefined para que Zod use .optional())
    AI_BASE_URL: core.getInput('ai_base_url') || undefined,
  });

  const logger = new ConsoleLogger(config);

  logger.info('🚀 Issue Scout Agent starting...', {
    provider: config.AI_PROVIDER,
    model: config.AI_MODEL,
    event: github.context.eventName,
    action: github.context.payload.action,
  });

  // Inicializar servicios
  const agentService = new AgentService(config, logger);
  const githubService = new GitHubServiceAdapter(config.GITHUB_TOKEN, logger);

  // Verificar que el código del repositorio esté disponible en el filesystem
  const hasCode = fs.existsSync('package.json') || fs.existsSync('src/');
  if (!hasCode) {
    logger.warn('⚠️ No se encontró código del repositorio en el directorio de trabajo. Asegúrate de incluir actions/checkout@v4 ANTES de usar moonslayers/issue-scout-agent en tu workflow.', {
      hint: 'Agrega: - uses: actions/checkout@v4',
      cwd: process.cwd(),
    });
  }

  // Inicializar casos de uso
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
