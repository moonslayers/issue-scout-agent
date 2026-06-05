import { execSync } from 'child_process';
import { ITool } from './tool.interface';
import { z } from 'zod';

export class GitDiffTool implements ITool {
  name = 'gitDiff';
  description = 'Obtiene el diff de git entre dos referencias. Útil para ver qué cambió en commits recientes o en una rama.';
  parameters = z.object({
    base: z.string().optional().default('HEAD~1').describe('Referencia base (commit, branch, tag)'),
    head: z.string().optional().default('HEAD').describe('Referencia head'),
    path: z.string().optional().describe('Ruta específica para filtrar el diff'),
    maxLines: z.number().optional().default(200).describe('Máximo de líneas del diff a retornar'),
    gitDir: z.string().optional().default('.').describe('Directorio del repositorio git (default: directorio actual)'),
  });

  async execute(params: { base?: string; head?: string; path?: string; maxLines?: number; gitDir?: string }): Promise<string> {
    try {
      const base = params.base ?? 'HEAD~1';
      const head = params.head ?? 'HEAD';
      const maxLines = params.maxLines ?? 200;
      const gitDir = params.gitDir ?? '.';

      let cmd = `git -C "${gitDir}" diff ${base}...${head} 2>/dev/null`;
      if (params.path) {
        cmd += ` -- "${params.path}"`;
      }
      cmd += ` | head -${maxLines}`;

      const output = execSync(cmd, { encoding: 'utf-8', timeout: 15000 });
      return output || 'No hay diferencias';
    } catch (error) {
      return `Error al obtener diff: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}
