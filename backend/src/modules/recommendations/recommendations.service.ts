import { RecommendationStatus } from '../../generated/prisma/client';
import { recommendationQueue } from '../../queue/recommendationQueue';
import { getLikesByUser } from '../likes/likes.repository';
import {createRecommendation,getRecommendationsByUser,type RecommendationRecord,
} from './recommendations.repository';

type RecommendationsErrorCode = 'NO_LIKES' | 'PENDING_ALREADY_EXISTS';

// el controller decide el status http a partir de este code, el service no sabe de http
export class RecommendationsServiceError extends Error {
  code: RecommendationsErrorCode;

  constructor(code: RecommendationsErrorCode, message: string) {
    super(message);
    this.name = 'RecommendationsServiceError';
    this.code = code;
  }
}

export async function requestRecommendation(userId: number): Promise<RecommendationRecord> {
  const likes = await getLikesByUser(userId);

  if (likes.length === 0) {
    throw new RecommendationsServiceError(
      'NO_LIKES',
      'marca al menos una pelicula como me gusta antes de pedir una recomendacion',
    );
  }

  // CLAUDE.md, regla 7 del flujo asincrono: idempotencia, no encolar si ya hay una pending
  const existingRecommendations = await getRecommendationsByUser(userId);
  const hasPendingRecommendation = existingRecommendations.some(
    (recommendation) => recommendation.status === RecommendationStatus.PENDING,
  );

  if (hasPendingRecommendation) {
    throw new RecommendationsServiceError(
      'PENDING_ALREADY_EXISTS',
      'ya tenes una recomendacion en curso, esperala antes de pedir otra',
    );
  }

  const recommendation = await createRecommendation(userId);

  await recommendationQueue.add('generate-recommendation', {
    recommendationId: recommendation.id,
    userId,
  });

  return recommendation;
}

export async function getUserRecommendations(userId: number): Promise<RecommendationRecord[]> {
  return getRecommendationsByUser(userId);
}
