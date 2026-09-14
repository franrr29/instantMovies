import { env } from './shared/env';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { authRouter } from './modules/auth/auth.routes';
import { chatRouter } from './modules/chat/chat.routes';
import { likesRouter } from './modules/likes/likes.routes';
import { moviesRouter } from './modules/movies/movies.routes';
import { recommendationsRouter } from './modules/recommendations/recommendations.routes';
import { errorHandler } from './shared/errorHandler';
import { healthCheck } from './shared/health';
import { requestIdMiddleware } from './shared/requestId';

const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

export const app = express();

app.use(requestIdMiddleware);

// sin auth, antes de cualquier middleware de autenticacion
app.get('/health', healthCheck);

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(rateLimiter);

app.use('/auth', authRouter);
app.use('/chat', chatRouter);
app.use('/movies', moviesRouter);
app.use('/likes', likesRouter);
app.use('/recommendations', recommendationsRouter);

app.use(errorHandler);
