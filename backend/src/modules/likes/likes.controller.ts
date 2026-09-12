import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { addLikeSchema } from './likes.schemas';
import {LikesServiceError,addLike as addLikeService,getUserLikes as getUserLikesService,removeLike as removeLikeService,
} from './likes.service';

export async function addLike(req: Request, res: Response, next: NextFunction) {
  try {

    const { tmdbMovieId } = addLikeSchema.parse(req.body);
    const userId = req.user!.id;

    const like = await addLikeService(userId, tmdbMovieId);

    res.status(201).json(like);

  } catch (err) {

    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'datos invalidos', details: err.flatten() });
      return;
    }

    if (err instanceof LikesServiceError && err.code === 'ALREADY_LIKED') {
      res.status(409).json({ error: err.message });
      return;
    }

    next(err);
  }
}

export async function removeLike(req: Request, res: Response, next: NextFunction) {
  try {

    const tmdbMovieId = Number(req.params.tmdbId);
    const userId = req.user!.id;

    await removeLikeService(userId, tmdbMovieId);
    res.status(204).send();

  } catch (err) {

    if (err instanceof LikesServiceError && err.code === 'LIKE_NOT_FOUND') {
      res.status(404).json({ error: err.message });
      return;

    }

    next(err);
  }
}


export async function getUserLikes(req: Request, res: Response, next: NextFunction) {

  try {
    const userId = req.user!.id;

    const likes = await getUserLikesService(userId);
    res.status(200).json(likes);

  } catch (err) {
    
    next(err);
  }
}
