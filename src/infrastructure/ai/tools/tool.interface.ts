import { z } from 'zod';

export interface ITool {
  name: string;
  description: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parameters: z.ZodObject<any>;
  execute(params: Record<string, unknown>): Promise<string>;
}
