import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { authenticate } from '../../shared/authenticate';
import { login, logout, me, register } from './auth.controller';



export const authRouter = Router();

// 5 intentos/min por IP para frenar fuerza bruta sobre login
const loginRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: 'demasiados intentos de login, intenta de nuevo en un minuto' });
  },
});

authRouter.post('/register', register);
authRouter.post('/login', loginRateLimiter, login);
authRouter.post('/logout', authenticate, logout);
authRouter.get('/me', authenticate, me);
