import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { authRouter } from './modules/auth/auth.routes';
import { errorHandler } from './shared/errorHandler';

// puerto de la API: lo consume index.ts al levantar el servidor con app.listen
export const PORT = Number(process.env.PORT) || 3000;

const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

// sin CORS_ORIGIN definida (todavia no hay .env) cae al puerto default de vite
const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';

export const app = express();

app.use(helmet());
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());
app.use(rateLimiter);

app.use('/auth', authRouter);

app.use(errorHandler);
