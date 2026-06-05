import { z } from 'zod';

export interface ITool {
  name: string;
  description: string;
  parameters: z.ZodObject<any>;
  execute(params: Record<string, unknown>): Promise<string>;
}
