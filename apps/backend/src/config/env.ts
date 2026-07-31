import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';

/** Sube directorios hasta encontrar config/dev-host.env (raíz del monorepo). */
function findRepoRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(dir, 'config', 'dev-host.env'))) return dir;
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  // tsx desde apps/backend
  const fromBackend = resolve(process.cwd(), '../..');
  if (existsSync(join(fromBackend, 'config', 'dev-host.env'))) return fromBackend;
  return process.cwd();
}

const repoRoot = findRepoRoot();
const backendEnvPath = join(repoRoot, 'apps', 'backend', '.env');

dotenv.config({ path: backendEnvPath });
dotenv.config();

function readDevHostApiPort(): number | undefined {
  const hostFile = join(repoRoot, 'config', 'dev-host.env');
  if (!existsSync(hostFile)) return undefined;
  for (const line of readFileSync(hostFile, 'utf8').split('\n')) {
    const m = line.match(/^DEV_API_PORT=(.+)$/);
    if (m) {
      const n = Number(m[1].trim());
      return Number.isFinite(n) && n > 0 ? n : undefined;
    }
  }
  return undefined;
}

/**
 * Prioridad LAN: config/dev-host.env (en Git) gana sobre .env local viejo.
 * Tras git pull, el API usa DEV_API_PORT aunque apps/backend/.env diga 4401.
 */
const lanPort = readDevHostApiPort();
if (lanPort != null) {
  process.env.PORT = String(lanPort);
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4410),
  INSTANCE_ID: z.string().default('backend-1'),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('*'),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE: z.coerce.number().default(10485760),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_DIR: z.string().optional(),
  APP_PUBLIC_URL: z.string().url().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  EXPO_ACCESS_TOKEN: z.string().optional(),
  TRUST_PROXY: z
    .string()
    .default('true')
    .transform((v) => v !== 'false' && v !== '0'),
  BACKUP_RETENTION_DAYS: z.coerce.number().default(14),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const isDev = env.NODE_ENV === 'development';
export const isProd = env.NODE_ENV === 'production';
