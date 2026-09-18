import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { numericId } from '../../shared/validators';
import { RecommendationsServiceError, getUserRecommendationById as getUserRecommendationByIdService, getUserRecommendations as getUserRecommendationsService, requestRecommendation as requestRecommendationService,
} from './recommendations.service';

export async function requestRecommendation(req: Request, res: Response, next: NextFunction) {
  try {

    const userId = req.user!.id;

    const recommendation = await requestRecommendationService(userId);

    res.status(202).json(recommendation);

  } catch (err) {

    if (err instanceof RecommendationsServiceError && err.code === 'NO_LIKES') {
      res.status(400).json({ error: err.message });
      return;
    }


    if (err instanceof RecommendationsServiceError && err.code === 'PENDING_ALREADY_EXISTS') {
      res.status(409).json({ error: err.message });
      return;
    }

    next(err);
  }
}

export async function getUserRecommendations(req: Request, res: Response, next: NextFunction) {

  try {
    const userId = req.user!.id;

    const recommendations = await getUserRecommendationsService(userId);
    res.status(200).json(recommendations);

  } catch (err) {
    next(err);
  }
}

export async function getUserRecommendationById(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const id = numericId.parse(req.params.id);

    const recommendation = await getUserRecommendationByIdService(id, userId);
    res.status(200).json(recommendation);

  } catch (err) {

    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'datos invalidos', details: err.flatten() });
      return;
    }

    if (err instanceof RecommendationsServiceError && err.code === 'NOT_FOUND') {
      res.status(404).json({ error: err.message });
      return;
    }

    next(err);
  }
}
