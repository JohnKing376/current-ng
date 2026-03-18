import z from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(9999),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  APP_NAME: z.string(),
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
