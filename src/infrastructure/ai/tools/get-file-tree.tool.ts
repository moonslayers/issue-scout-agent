import { execSync } from 'child_process';
import { ITool } from './tool.interface';
import { z } from 'zod';

export class GetFileTreeTool implements ITool {
  name = 'getFileTree';
  description = 'Obtiene la estructura de archivos del repositorio (primeros 2 niveles)';
  parameters = z.object({
    filePattern: z.string().optional().default('*').describe('Patrón de archivos (ej: "*.ts")'),
    maxDepth: z.number().optional().default(2).describe('Profundidad máxima'),
    maxResults: z.number().optional().default(100).describe('Máximo de resultados'),
  });

  async execute(params: { filePattern?: string; maxDepth?: number; maxResults?: number }): Promise<string> {
    try {
      const depth = params.maxDepth ?? 2;
      const maxResults = params.maxResults ?? 100;
      const pattern = params.filePattern || '*';
      const cmd = `find . -maxdepth ${depth} -type f -name "${pattern}" | head -${maxResults}`;
      const output = execSync(cmd, { encoding: 'utf-8', timeout: 10000 });
      return output || 'No se encontraron archivos';
    } catch (error) {
      return `Error al obtener árbol: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}
