import { z } from 'zod';

const envSchema = z.object({
  // AI Provider
  AI_PROVIDER: z.enum(['openai', 'anthropic', 'deepseek', 'custom']).default('openai'),
  AI_API_KEY: z.string().min(1, 'AI_API_KEY is required'),
  AI_BASE_URL: z.string().url().optional(),
  AI_MODEL: z.string().min(1, 'AI_MODEL is required'),
  AI_PROVIDER_OPTIONS: z.string().optional(),

  // AI Behavior
  AI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.3),
  AI_TIMEOUT: z.coerce.number().int().positive().default(60),

  // GitHub
  GITHUB_TOKEN: z.string().min(1, 'GITHUB_TOKEN is required'),
  GITHUB_REPOSITORY_OWNER: z.string().min(1, 'GITHUB_REPOSITORY_OWNER is required'),
  GITHUB_REPOSITORY_NAME: z.string().min(1, 'GITHUB_REPOSITORY_NAME is required'),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  DEBUG_TOOLS: z.string().default('false').transform((val) => val === 'true' || val === '1'),
  DEBUG_PROMPTS: z.string().default('false').transform((val) => val === 'true' || val === '1'),
  AUTOMATIC_SCOUT: z.string().default('false').transform((val) => val === 'true' || val === '1'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function loadConfig(overrides?: Record<string, string | undefined>): EnvConfig {
  const env = { ...process.env, ...overrides };
  const result = envSchema.safeParse(env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.format());
    process.exit(1);
  }

  return result.data;
}
