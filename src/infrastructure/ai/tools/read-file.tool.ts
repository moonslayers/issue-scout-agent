import fs from 'fs';
import { ITool } from './tool.interface';
import { z } from 'zod';

export class ReadFileTool implements ITool {
  name = 'readFile';
  description = 'Lee el contenido de un archivo. Retorna primeras N líneas y últimas M líneas para archivos grandes.';
  parameters = z.object({
    path: z.string().describe('Ruta del archivo a leer (ej: "src/app/main.ts")'),
    headLines: z.number().optional().default(50).describe('Número de líneas a leer desde el inicio'),
    tailLines: z.number().optional().default(20).describe('Número de líneas a leer desde el final'),
  });

  async execute(params: { path: string; headLines?: number; tailLines?: number }): Promise<string> {
    try {
      if (!fs.existsSync(params.path)) {
        return `Error: El archivo "${params.path}" no existe`;
      }

      const content = fs.readFileSync(params.path, 'utf-8');
      const lines = content.split('\n');
      const totalLines = lines.length;
      const head = params.headLines ?? 50;
      const tail = params.tailLines ?? 20;

      if (totalLines <= head + tail) {
        return content;
      }

      const headContent = lines.slice(0, head).join('\n');
      const tailContent = lines.slice(-tail).join('\n');
      const omitted = totalLines - head - tail;

      return `${headContent}\n\n... [${omitted} líneas omitidas de ${totalLines} totales] ...\n\n${tailContent}`;
    } catch (error) {
      return `Error al leer archivo: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}
