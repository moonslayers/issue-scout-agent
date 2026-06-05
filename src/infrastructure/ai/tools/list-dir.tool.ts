import { execSync } from 'child_process';
import { ITool } from './tool.interface';
import { z } from 'zod';

export class ListDirTool implements ITool {
  name = 'listDir';
  description = 'Lista todos los archivos y directorios en una ruta específica del repositorio using `find` command';
  parameters = z.object({
    path: z.string().describe('Ruta del directorio a listar (ej: "src/app")'),
    maxDepth: z.number().optional().default(2).describe('Profundidad máxima del árbol'),
  });

  async execute(params: { path: string; maxDepth?: number }): Promise<string> {
    try {
      const depth = params.maxDepth ?? 2;
      const cmd = `find "${params.path}" -maxdepth ${depth} -type f 2>/dev/null | head -100`;
      const output = execSync(cmd, { encoding: 'utf-8', timeout: 10000 });
      return output || 'Directorio vacío o no encontrado';
    } catch (error) {
      return `Error al listar directorio: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}
