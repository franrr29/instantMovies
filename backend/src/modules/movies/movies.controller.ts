import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

import { paginationQuery } from '../../shared/validators';
import { listMovies, listTrendingMovies } from './movies.service';



const moviesQuery = paginationQuery.extend({ query: z.string().optional() });



export async function getMovies(req: Request, res: Response, next: NextFunction) {
  try {
    const { query, page } = moviesQuery.parse(req.query);

    const movies = await listMovies(query, page);
    res.status(200).json(movies);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'datos invalidos', details: err.flatten() });
      return;
    }

    next(err);
  }
}



export async function getTrendingMovies(req: Request, res: Response, next: NextFunction) {
  try {
    const { page } = paginationQuery.parse(req.query);

    const movies = await listTrendingMovies(page);
    res.status(200).json(movies);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'datos invalidos', details: err.flatten() });
      return;
    }

    next(err);
  }
}
