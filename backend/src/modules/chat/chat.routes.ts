import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { authenticate } from '../../shared/authenticate';
import { sendMessage } from './chat.controller';



export const chatRouter = Router();

chatRouter.use(authenticate);

// 10 requests/min por usuario; keyGenerator usa req.user
const chatRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user!.id),
  handler: (_req, res) => {
    res.status(429).json({ error: 'demasiados mensajes, intenta de nuevo en un minuto' });
  },
});

chatRouter.post('/', chatRateLimiter, sendMessage);
