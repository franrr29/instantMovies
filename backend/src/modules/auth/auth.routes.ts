import { Router } from 'express';
import { authenticate } from '../../shared/authenticate';
import { login, logout, me, register } from './auth.controller';

export const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/logout', authenticate, logout);
authRouter.get('/me', authenticate, me);
