import { Router } from 'express';
import { authenticate } from '../../shared/authenticate';
import { getMovies } from './movies.controller';

export const moviesRouter = Router();

moviesRouter.use(authenticate);

moviesRouter.get('/', getMovies);
