import { z } from 'zod';

export interface ITool {
  name: string;
  description: string;
  parameters: z.ZodObject<z.ZodRawShape>;
  execute(params: Record<string, unknown>): Promise<string>;
}
