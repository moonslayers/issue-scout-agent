import { execSync } from 'child_process';
import { ITool } from './tool.interface';
import { z } from 'zod';

export class SearchCodeTool implements ITool {
  name = 'searchCode';
  description = 'Busca texto en el código usando grep. Busca en archivos .ts, .tsx, .js, .jsx, .json, .yml, .yaml, .md por defecto';
  parameters = z.object({
    query: z.string().describe('Texto a buscar (ej: "function calculateTotal")'),
    filePattern: z.string().optional().describe('Patrón de archivos (opcional, ej: "*.ts")'),
    maxResults: z.number().optional().default(20).describe('Máximo de resultados a retornar'),
  });

  async execute(params: { query: string; filePattern?: string; maxResults?: number }): Promise<string> {
    try {
      const maxResults = params.maxResults ?? 20;
      const filePattern = params.filePattern || '*.{ts,tsx,js,jsx,json,yml,yaml,md}';
      const cmd = `grep -rl --include=${filePattern} "${params.query}" . | head -${maxResults}`;
      const output = execSync(cmd, { encoding: 'utf-8', timeout: 15000 });
      return output || 'No se encontraron resultados';
    } catch (error) {
      if ((error as { status?: number }).status === 1) {
        return 'No se encontraron resultados';
      }
      return `Error en búsqueda: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}
