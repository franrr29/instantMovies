import { Router } from 'express';
import { authenticate } from '../../shared/authenticate';
import { addLike, getUserLikes, removeLike } from './likes.controller';

export const likesRouter = Router();

likesRouter.use(authenticate);

likesRouter.post('/', addLike);
likesRouter.get('/', getUserLikes);
likesRouter.delete('/:tmdbId', removeLike);
