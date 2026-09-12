import 'dotenv/config';
import { Worker, type Job } from 'bullmq';
import { getLikesByUser } from './modules/likes/likes.repository';
import {
  completeRecommendation,
  failRecommendation,
} from './modules/recommendations/recommendations.repository';
import { redisConnection } from './queue/recommendationQueue';
import { generateRecommendation } from './shared/groq';
import { logger } from './shared/logger';
import { getMovieById } from './shared/tmdb';

interface RecommendationJobData {
  recommendationId: number;
  userId: number;
}

async function processRecommendationJob(job: Job<RecommendationJobData>): Promise<void> {
  const { recommendationId, userId } = job.data;

  logger.info({ recommendationId, userId }, 'job de recomendacion recibido');

  try {
    const likes = await getLikesByUser(userId);

    if (likes.length === 0) {
      logger.error({ recommendationId, userId }, 'el usuario no tiene likes, no se puede armar el contexto');
      await failRecommendation(recommendationId);
      return;
    }

    const likedMovies = await Promise.all(
      likes.map(async (like) => {
        const movie = await getMovieById(like.tmdbMovieId);
        return { id: movie.id, title: movie.title, genres: movie.genres.map((genre) => genre.name) };
      }),
    );

    logger.info({ recommendationId }, 'llamando a groq');

    const result = await generateRecommendation(likedMovies);

    logger.info({ recommendationId, result }, 'respuesta de groq validada');

    await completeRecommendation(recommendationId, result.tmdbMovieId, result.reason);

    logger.info({ recommendationId, tmdbMovieId: result.tmdbMovieId }, 'recomendacion completada');
  } catch (err) {
    const maxAttempts = job.opts.attempts ?? 1;

    if (job.attemptsMade < maxAttempts - 1) {
      logger.warn(
        { err, recommendationId, userId, attemptsMade: job.attemptsMade },
        'fallo el procesamiento de la recomendacion, se reintentara',
      );
      throw err;
    }

    logger.error(
      { err, recommendationId, userId, attemptsMade: job.attemptsMade },
      'fallo el procesamiento de la recomendacion, se agotaron los reintentos, se marca como failed',
    );
    await failRecommendation(recommendationId);
  }
}

export const recommendationWorker = new Worker<RecommendationJobData>(
  'recommendations',
  processRecommendationJob,
  {
    connection: redisConnection,
    // conservador para el free tier de groq: 28 jobs por minuto
    limiter: { max: 28, duration: 60000 },
  },
);

logger.info('worker de recomendaciones arrancado');
