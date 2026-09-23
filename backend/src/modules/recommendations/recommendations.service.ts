import { RecommendationStatus } from '../../generated/prisma/client';
import { recommendationQueue } from '../../queue/recommendationQueue';
import { getLikesByUser } from '../likes/likes.repository';
import {
  createRecommendation,
  getRecommendationByIdForUser,
  getRecommendationsByUser,
  type RecommendationRecord,
} from './recommendations.repository';
import { GROQ_MAX_RETRIES, GROQ_RETRY_BACKOFF_MS } from '../../shared/constants';
import { getMovieById } from '../../shared/tmdb';



type RecommendationsErrorCode = 'NO_LIKES' | 'PENDING_ALREADY_EXISTS' | 'NOT_FOUND';



// el controller decide el status http a partir de este code, el service no sabe de http
export class RecommendationsServiceError extends Error {
  code: RecommendationsErrorCode;

  constructor(code: RecommendationsErrorCode, message: string) {
    super(message);
    this.name = 'RecommendationsServiceError';
    this.code = code;
  }
}



export interface EnrichedRecommendedMovie {
  tmdbMovieId: number;
  reason: string;
  title: string;
  overview: string;
  posterPath: string | null;
  voteAverage: number;
}

export interface EnrichedRecommendation {
  id: number;
  userId: number;
  status: RecommendationStatus;
  createdAt: Date;
  movies: EnrichedRecommendedMovie[] | null;
}



async function enrichRecommendation(recommendation: RecommendationRecord): Promise<EnrichedRecommendation> {
  const movies = recommendation.movies
    ? await Promise.all(
        recommendation.movies.map(async (movie) => {
          try {
            const tmdbMovie = await getMovieById(movie.tmdbMovieId);
            return {
              tmdbMovieId: movie.tmdbMovieId,
              reason: movie.reason,
              title: tmdbMovie.title,
              overview: tmdbMovie.overview,
              posterPath: tmdbMovie.poster_path,
              voteAverage: tmdbMovie.vote_average,
            };
          } catch {
            return {
              tmdbMovieId: movie.tmdbMovieId,
              reason: movie.reason,
              title: '',
              overview: '',
              posterPath: null,
              voteAverage: 0,
            };
          }
        }),
      )
    : null;

  return {
    id: recommendation.id,
    userId: recommendation.userId,
    status: recommendation.status,
    createdAt: recommendation.createdAt,
    movies,
  };
}



export async function requestRecommendation(userId: number): Promise<RecommendationRecord> {
  const likes = await getLikesByUser(userId);

  if (likes.length === 0) {
    throw new RecommendationsServiceError(
      'NO_LIKES',
      'marca al menos una pelicula como me gusta antes de pedir una recomendacion',
    );
  }

  // idempotencia: no encolar si el usuario ya tiene una recomendacion pending
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

  await recommendationQueue.add(
    'generate-recommendation',
    {
      recommendationId: recommendation.id,
      userId,
    },
    {
      attempts: GROQ_MAX_RETRIES,
      backoff: { type: 'exponential', delay: GROQ_RETRY_BACKOFF_MS },
    },
  );

  return recommendation;
}



export async function getUserRecommendations(userId: number): Promise<EnrichedRecommendation[]> {
  const recommendations = await getRecommendationsByUser(userId);
  return Promise.all(recommendations.map(enrichRecommendation));
}



export async function getUserRecommendationById(
  id: number,
  userId: number,
): Promise<EnrichedRecommendation> {
  const recommendation = await getRecommendationByIdForUser(id, userId);

  if (!recommendation) {
    throw new RecommendationsServiceError('NOT_FOUND', 'no se encontro la recomendacion');
  }

  return enrichRecommendation(recommendation);
}
