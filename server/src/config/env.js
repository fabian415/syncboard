import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  AI_BASE_URL: z.string().min(1),
  AI_API_KEY: z.string().min(1),
  AI_MODEL: z.string().min(1),
  AI_TIMEOUT_MS: z.coerce.number().default(60000),
  PORT: z.coerce.number().default(3000),
  STORAGE_ROOT: z.string().default('../storage'),
  NODE_ENV: z.string().default('development'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
