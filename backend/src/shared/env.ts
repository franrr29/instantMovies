import 'dotenv/config';
import { z } from 'zod';
import { logger } from './logger';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  TMDB_API_KEY: z.string().min(1),
  GROQ_API_KEY: z.string().min(1),
  PORT: z.coerce.number().default(3001),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const missingVars = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
  logger.error({ issues: parsed.error.issues }, `faltan o son invalidas las siguientes variables de entorno: ${missingVars}`);
  process.exit(1);
}

export const env = parsed.data;
