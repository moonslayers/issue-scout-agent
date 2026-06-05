import { generateText, tool, stepCountIs } from 'ai';
import { z } from 'zod';
import { EnvConfig } from '../../shared/config/environment.config';
import { ILogger } from '../../shared/logger/logger.interface';
import { ProviderFactory } from '../../infrastructure/ai/provider-factory';
import { ListDirTool } from '../../infrastructure/ai/tools/list-dir.tool';
import { ReadFileTool } from '../../infrastructure/ai/tools/read-file.tool';
import { SearchCodeTool } from '../../infrastructure/ai/tools/search-code.tool';
import { GetFileTreeTool } from '../../infrastructure/ai/tools/get-file-tree.tool';
import { GitDiffTool } from '../../infrastructure/ai/tools/git-diff.tool';
import { EXPLORE_SYSTEM_PROMPT, GENERATE_SYSTEM_PROMPT } from '../../infrastructure/ai/prompts/system-prompt';

type ErrorWithCause = Error & { cause?: unknown };

export class AgentService {
  private readonly listDirTool = new ListDirTool();
  private readonly readFileTool = new ReadFileTool();
  private readonly searchCodeTool = new SearchCodeTool();
  private readonly getFileTreeTool = new GetFileTreeTool();
  private readonly gitDiffTool = new GitDiffTool();

  constructor(
    private readonly config: EnvConfig,
    private readonly logger: ILogger
  ) {}

  async investigate(issueTitle: string, issueBody: string): Promise<string> {
    this.logger.info('Starting investigation', { title: issueTitle });

    const model = ProviderFactory.create(this.config);

    try {
      // ============================================
      // Fase 1: Exploración con herramientas
      // Sin maxOutputTokens (incluye thinking + tools + texto)
      // Sin stopWhen (el modelo decide cuándo terminar)
      // maxSteps alto como safety net
      // ============================================
      this.logger.info('Phase 1: Exploring codebase with tools');
      const exploreResult = await generateText({
        model,
        system: EXPLORE_SYSTEM_PROMPT,
        prompt: this.buildExplorePrompt(issueTitle, issueBody),
        tools: this.buildTools(),
        stopWhen: stepCountIs(999),
        temperature: this.config.AI_TEMPERATURE,
      });

      const context = exploreResult.text?.trim() || 'No se generó resumen de exploración.';

      this.logger.info('Phase 1 completed', {
        steps: exploreResult.steps?.length,
        tokens: exploreResult.usage?.totalTokens,
        contextLength: context.length,
      });

      if (this.config.DEBUG_PROMPTS) {
        this.logger.debug('Exploration context', { text: context });
      }

      // ============================================
      // Fase 2: Generación del plan SIN herramientas
      // Con reintento hasta 3 veces si sale vacío
      // Sin thinking/reasoning para ahorrar tokens
      // ============================================
      this.logger.info('Phase 2: Generating plan');
      let plan = '';
      let attempt = 0;
      const maxAttempts = 3;

      while (!plan && attempt < maxAttempts) {
        attempt++;
        this.logger.info(`Plan generation attempt ${attempt}/${maxAttempts}`);

        const planResult = await generateText({
          model,
          system: GENERATE_SYSTEM_PROMPT,
          prompt: this.buildGeneratePlanPrompt(issueTitle, issueBody, context, attempt > 1),
          // Sin tools - todo el presupuesto va al texto
          temperature: this.config.AI_TEMPERATURE,
        });

        plan = planResult.text?.trim() ?? '';

        if (!plan && attempt < maxAttempts) {
          this.logger.warn('Plan generation returned empty, retrying', { attempt });
        }
      }

      if (!plan) {
        this.logger.warn('All plan generation attempts failed');
        return '\n\n⚠️ **No se pudo generar un plan técnico.** El modelo no produjo respuesta después de varios intentos. Puedes intentar:\n- Ejecutar `/update` para regenerar\n- Usar `/investigate [componente]` para investigar un área específica';
      }

      this.logger.info('Plan generated successfully', { attempts: attempt, length: plan.length });
      return plan;
    } catch (error) {
      this.logger.error('AI investigation call failed', {
        title: issueTitle,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        cause: error instanceof Error ? JSON.stringify((error as ErrorWithCause).cause) : undefined,
        provider: this.config.AI_PROVIDER,
        model: this.config.AI_MODEL,
        baseURL: this.config.AI_BASE_URL,
      });
      throw error;
    }
  }

  async handleCommand(command: string, issueTitle: string, issueBody: string): Promise<{ response: string; wasUpdate: boolean }> {
    this.logger.info('Handling command', { command });

    const model = ProviderFactory.create(this.config);
    const isUpdate = command.trim().toLowerCase() === '/update';

    try {
      const result = await generateText({
        model,
        system: GENERATE_SYSTEM_PROMPT,
        prompt: this.buildCommandPrompt(command, issueTitle, issueBody),
        tools: this.buildTools(),
        stopWhen: stepCountIs(999),
        temperature: this.config.AI_TEMPERATURE,
      });

      let response = result.text?.trim() ?? '';

      // Reintento si la respuesta está vacía
      let attempt = 0;
      while (!response && attempt < 2) {
        attempt++;
        this.logger.warn('Command response empty, retrying', { attempt });

        const retryResult = await generateText({
          model,
          system: GENERATE_SYSTEM_PROMPT,
          prompt: `El comando anterior no generó respuesta. Usando este contexto:\n\nTítulo: ${issueTitle}\nDescripción: ${issueBody || 'Sin descripción'}\n\nComando: ${command}\n\nResponde AHORA sin usar herramientas.`,
          temperature: this.config.AI_TEMPERATURE,
        });

        response = retryResult.text?.trim() ?? '';
      }

      return {
        response: response || 'No se pudo generar respuesta.',
        wasUpdate: isUpdate,
      };
    } catch (error) {
      this.logger.error('AI command call failed', {
        command,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        cause: error instanceof Error ? JSON.stringify((error as ErrorWithCause).cause) : undefined,
        provider: this.config.AI_PROVIDER,
        model: this.config.AI_MODEL,
        baseURL: this.config.AI_BASE_URL,
      });
      throw error;
    }
  }

  private buildExplorePrompt(title: string, body: string): string {
    return `## Issue a Investigar\n\n**Título:** ${title}\n\n**Descripción:** ${body || 'Sin descripción proporcionada'}\n\nExplora el código del repositorio para entender este issue. Usa las herramientas disponibles para encontrar archivos relevantes, leer su contenido y comprender las relaciones entre componentes. Al final, proporciona un resumen de tus hallazgos.`;
  }

  private buildGeneratePlanPrompt(title: string, body: string, context: string, isRetry: boolean): string {
    const retryInstruction = isRetry
      ? '\n\n**IMPORTANTE: El intento anterior no generó texto. Debes generar AHORA el plan completo. No uses herramientas, solo escribe el plan.**'
      : '';

    return `## Contexto de exploración\n\n**Título del issue:** ${title}\n\n**Descripción:** ${body || 'Sin descripción proporcionada'}\n\n**Hallazgos de la exploración:**\n${context}\n\n---\n\nAhora genera el plan técnico completo basado en el contexto anterior. NO uses herramientas, solo genera el plan en texto.${retryInstruction}`;
  }

  private buildCommandPrompt(command: string, title: string, body: string): string {
    const isUpdate = command.trim().toLowerCase() === '/update';

    if (isUpdate) {
      return `## Comando: /update - Actualizar Plan\n\n**Issue:** ${title}\n\n**Descripción original:** ${body || 'Sin descripción'}\n\nEl usuario ha solicitado actualizar el plan de implementación. Re-investiga el código actual y genera un plan actualizado.`;
    }

    return `## Comando: ${command}\n\n**Contexto del Issue:**\n**Título:** ${title}\n**Descripción:** ${body || 'Sin descripción'}\n\nResponde al comando del usuario basado en el contexto del issue y el código del repositorio.`;
  }

  private buildTools() {
    return {
      listDir: tool({
        description: this.listDirTool.description,
        inputSchema: this.listDirTool.parameters,
        execute: async (input: z.infer<typeof this.listDirTool.parameters>) => {
          this.logger.debug('Executing tool: listDir', input as unknown as Record<string, unknown>);
          if (this.config.DEBUG_TOOLS) {
            this.logger.info('🔍 listDir', input as unknown as Record<string, unknown>);
          }
          return this.listDirTool.execute(input);
        },
      }),
      readFile: tool({
        description: this.readFileTool.description,
        inputSchema: this.readFileTool.parameters,
        execute: async (input: z.infer<typeof this.readFileTool.parameters>) => {
          this.logger.debug('Executing tool: readFile', input as unknown as Record<string, unknown>);
          if (this.config.DEBUG_TOOLS) {
            this.logger.info('📄 readFile', input as unknown as Record<string, unknown>);
          }
          return this.readFileTool.execute(input);
        },
      }),
      searchCode: tool({
        description: this.searchCodeTool.description,
        inputSchema: this.searchCodeTool.parameters,
        execute: async (input: z.infer<typeof this.searchCodeTool.parameters>) => {
          this.logger.debug('Executing tool: searchCode', input as unknown as Record<string, unknown>);
          if (this.config.DEBUG_TOOLS) {
            this.logger.info('🔎 searchCode', input as unknown as Record<string, unknown>);
          }
          return this.searchCodeTool.execute(input);
        },
      }),
      getFileTree: tool({
        description: this.getFileTreeTool.description,
        inputSchema: this.getFileTreeTool.parameters,
        execute: async (input: z.infer<typeof this.getFileTreeTool.parameters>) => {
          this.logger.debug('Executing tool: getFileTree', input as unknown as Record<string, unknown>);
          if (this.config.DEBUG_TOOLS) {
            this.logger.info('📁 getFileTree');
          }
          return this.getFileTreeTool.execute(input);
        },
      }),
      gitDiff: tool({
        description: this.gitDiffTool.description,
        inputSchema: this.gitDiffTool.parameters,
        execute: async (input: z.infer<typeof this.gitDiffTool.parameters>) => {
          this.logger.debug('Executing tool: gitDiff', input as unknown as Record<string, unknown>);
          if (this.config.DEBUG_TOOLS) {
            this.logger.info('🔀 gitDiff', input as unknown as Record<string, unknown>);
          }
          return this.gitDiffTool.execute(input);
        },
      }),
    };
  }
}
