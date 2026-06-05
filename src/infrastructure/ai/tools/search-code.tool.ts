import { execSync } from 'child_process';
import { ITool } from './tool.interface';
import { z } from 'zod';

const DEFAULT_EXTENSIONS = ['ts', 'tsx', 'js', 'jsx', 'json', 'yml', 'yaml', 'md'];

export class SearchCodeTool implements ITool {
  name = 'searchCode';
  description = 'Busca texto en el código usando ripgrep. Busca en archivos .ts, .tsx, .js, .jsx, .json, .yml, .yaml, .md por defecto';
  parameters = z.object({
    query: z.string().describe('Texto a buscar (ej: "function calculateTotal")'),
    filePattern: z.string().optional().describe('Patrón de archivos (opcional, ej: "*.ts")'),
    maxResults: z.number().optional().default(20).describe('Máximo de resultados a retornar'),
    searchPath: z.string().optional().default('.').describe('Ruta donde buscar (default: directorio actual)'),
  });

  async execute(params: { query: string; filePattern?: string; maxResults?: number; searchPath?: string }): Promise<string> {
    try {
      const maxResults = params.maxResults ?? 20;
      const searchPath = params.searchPath ?? '.';
      const glob = params.filePattern
        ? `-g "${params.filePattern}"`
        : DEFAULT_EXTENSIONS.map(ext => `-g "*.${ext}"`).join(' ');

      const cmd = `rg -l ${glob} "${params.query}" "${searchPath}" | head -${maxResults}`;
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
