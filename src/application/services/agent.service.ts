import { generateText, tool, stepCountIs, LanguageModel } from 'ai';
import { z } from 'zod';
import { EnvConfig } from '../../shared/config/environment.config';
import { ILogger } from '../../shared/logger/logger.interface';
import { ProviderFactory } from '../../infrastructure/ai/provider-factory';
import { ListDirTool } from '../../infrastructure/ai/tools/list-dir.tool';
import { ReadFileTool } from '../../infrastructure/ai/tools/read-file.tool';
import { SearchCodeTool } from '../../infrastructure/ai/tools/search-code.tool';
import { GetFileTreeTool } from '../../infrastructure/ai/tools/get-file-tree.tool';
import { GitDiffTool } from '../../infrastructure/ai/tools/git-diff.tool';
import { SYSTEM_PROMPT } from '../../infrastructure/ai/prompts/system-prompt';

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

    const result = await generateText({
      model,
      system: SYSTEM_PROMPT,
      prompt: this.buildInvestigatePrompt(issueTitle, issueBody),
      tools: this.buildTools(),
      stopWhen: stepCountIs(this.config.AI_MAX_ITERATIONS),
      temperature: this.config.AI_TEMPERATURE,
      maxOutputTokens: this.config.AI_MAX_TOKENS,
    });

    this.logger.info('Investigation completed', {
      tokensUsed: result.usage?.totalTokens,
      steps: result.steps?.length,
    });

    if (this.config.DEBUG_PROMPTS) {
      this.logger.debug('Full response', { text: result.text });
    }

    return result.text;
  }

  async handleCommand(command: string, issueTitle: string, issueBody: string): Promise<{ response: string; wasUpdate: boolean }> {
    this.logger.info('Handling command', { command });

    const model = ProviderFactory.create(this.config);
    const isUpdate = command.trim().toLowerCase() === '/update';

    const result = await generateText({
      model,
      system: SYSTEM_PROMPT,
      prompt: this.buildCommandPrompt(command, issueTitle, issueBody),
      tools: this.buildTools(),
      stopWhen: stepCountIs(this.config.AI_MAX_ITERATIONS),
      temperature: this.config.AI_TEMPERATURE,
      maxOutputTokens: this.config.AI_MAX_TOKENS,
    });

    return {
      response: result.text,
      wasUpdate: isUpdate,
    };
  }

  private buildInvestigatePrompt(title: string, body: string): string {
    return `## Issue a Investigar\n\n**Título:** ${title}\n\n**Descripción:** ${body || 'Sin descripción proporcionada'}\n\nPor favor, investiga este issue usando las herramientas disponibles y genera un plan técnico detallado.`;
  }

  private buildCommandPrompt(command: string, title: string, body: string): string {
    const isUpdate = command.trim().toLowerCase() === '/update';

    if (isUpdate) {
      return `## Comando: /update - Actualizar Plan\n\n**Issue:** ${title}\n\n**Descripción original:** ${body || 'Sin descripción'}\n\nEl usuario ha solicitado actualizar el plan de implementación. Re-investiga el código actual (puede haber cambiado desde la última revisión) y genera un plan actualizado.`;
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
