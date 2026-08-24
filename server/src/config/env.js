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
  DEEP_DIVE_MAX_UPLOAD_MB: z.coerce.number().default(500),
  // Points at the dedicated `unoserver` sidecar container (docker/unoserver)
  // that does the actual LibreOffice PPTX->PDF conversion. Defaults assume
  // local/non-Docker dev, where nothing is listening on this port — the
  // conversion call fails cleanly (asset marked FAILED) rather than crashing.
  UNOSERVER_HOST: z.string().default('localhost'),
  UNOSERVER_PORT: z.coerce.number().default(2003),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
