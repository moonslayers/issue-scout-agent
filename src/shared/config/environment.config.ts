import { z } from 'zod';

const envSchema = z.object({
  // AI Provider
  AI_PROVIDER: z.enum(['openai', 'anthropic', 'custom']).default('openai'),
  AI_API_KEY: z.string().min(1, 'AI_API_KEY is required'),
  AI_BASE_URL: z.string().url().optional(),
  AI_MODEL: z.string().min(1, 'AI_MODEL is required'),

  // AI Behavior
  AI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.3),
  AI_MAX_TOKENS: z.coerce.number().int().positive().default(2000),
  AI_MAX_ITERATIONS: z.coerce.number().int().positive().default(10),
  AI_TIMEOUT: z.coerce.number().int().positive().default(60),

  // GitHub
  GITHUB_TOKEN: z.string().min(1, 'GITHUB_TOKEN is required'),
  GITHUB_REPOSITORY_OWNER: z.string().min(1, 'GITHUB_REPOSITORY_OWNER is required'),
  GITHUB_REPOSITORY_NAME: z.string().min(1, 'GITHUB_REPOSITORY_NAME is required'),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  DEBUG_TOOLS: z.coerce.boolean().default(false),
  DEBUG_PROMPTS: z.coerce.boolean().default(false),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function loadConfig(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.format());
    process.exit(1);
  }

  return result.data;
}
