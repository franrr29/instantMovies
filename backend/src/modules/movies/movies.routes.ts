import { Router } from 'express';
import { authenticate } from '../../shared/authenticate';
import { getMovies, getTrendingMovies } from './movies.controller';

export const moviesRouter = Router();

moviesRouter.use(authenticate);

moviesRouter.get('/trending', getTrendingMovies);
moviesRouter.get('/', getMovies);
