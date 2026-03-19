import z from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(9999),
  DB_NAME: z.string(),
  DB_PASSWORD: z.string(),
  DB_USER: z.string(),
  DB_PORT: z.coerce.number().default(5432),
  REDIS_PORT: z.coerce.number().default(6379),
  APP_NAME: z.string(),
  DATABASE_URL: z.string(),
});

export function validate(config: Record<string, unknown>) {
  const parsed = EnvSchema.safeParse(config);

  if (!parsed.success) {
    throw new Error(
      `Invalid environment variables:\n${JSON.stringify(z.treeifyError(parsed.error), null, 2)}`,
    );
  }

  return parsed.data;
}
