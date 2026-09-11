import type { NextFunction, Request, Response } from 'express';
import { listMovies } from './movies.service';

export async function getMovies(req: Request, res: Response, next: NextFunction) {
  try {
    const query = typeof req.query.query === 'string' ? req.query.query : undefined;
    const page = req.query.page ? Number(req.query.page) : undefined;

    const movies = await listMovies(query, page);
    res.status(200).json(movies);
  } catch (err) {
    next(err);
  }
}
