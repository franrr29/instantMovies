import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { env } from './shared/env';
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
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(rateLimiter);

const apiRouter = express.Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/chat', chatRouter);
apiRouter.use('/movies', moviesRouter);
apiRouter.use('/likes', likesRouter);
apiRouter.use('/recommendations', recommendationsRouter);

app.use('/api/v1', apiRouter);

app.use(errorHandler);
