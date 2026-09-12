import { Router } from 'express';
import { authenticate } from '../../shared/authenticate';
import { sendMessage } from './chat.controller';

export const chatRouter = Router();

chatRouter.use(authenticate);

chatRouter.post('/', sendMessage);
