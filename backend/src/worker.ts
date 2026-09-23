import { Worker, type Job } from 'bullmq';

import './shared/env';
import { getLikesByUser } from './modules/likes/likes.repository';
import {
  completeRecommendation,
  failRecommendation,
  getCompletedByUser,
} from './modules/recommendations/recommendations.repository';
import { RECOMMENDATIONS_QUEUE_NAME, redisConnection } from './queue/recommendationQueue';
import { GROQ_FALLBACK_MODEL, GROQ_RATE_LIMIT_MAX, GROQ_RATE_LIMIT_WINDOW_MS } from './shared/constants';
import { prisma } from './shared/db';
import { generateRecommendation } from './shared/groq';
import { logger } from './shared/logger';
import { getMovieById } from './shared/tmdb';



interface RecommendationJobData {
  recommendationId: number;
  userId: number;
}



// titulos de tandas anteriores para que groq no los repita; los que tmdb no resuelve se ignoran
async function getPreviouslyRecommendedTitles(userId: number): Promise<string[]> {
  const completed = await getCompletedByUser(userId);
  const tmdbIds = new Set(completed.flatMap((recommendation) => recommendation.movies ?? []).map((movie) => movie.tmdbMovieId));

  const lookups = await Promise.allSettled([...tmdbIds].map((tmdbId) => getMovieById(tmdbId)));

  return lookups.flatMap((lookup) => (lookup.status === 'fulfilled' ? [lookup.value.title] : []));
}



async function processRecommendationJob(job: Job<RecommendationJobData>): Promise<void> {
  const { recommendationId, userId } = job.data;

  logger.info({ recommendationId, userId }, 'job de recomendacion recibido');

  // fuera del try para poder reusarlo en el fallback
  let likedMovies: { id: number; title: string; genres: string[] }[] | undefined;
  let previouslyRecommended: string[] = [];

  try {
    const likes = await getLikesByUser(userId);

    if (likes.length === 0) {
      logger.error({ recommendationId, userId }, 'el usuario no tiene likes, no se puede armar el contexto');
      await failRecommendation(recommendationId);
      return;
    }

    likedMovies = await Promise.all(
      likes.map(async (like) => {
        const movie = await getMovieById(like.tmdbMovieId);
        return { id: movie.id, title: movie.title, genres: movie.genres.map((genre) => genre.name) };
      }),
    );

    previouslyRecommended = await getPreviouslyRecommendedTitles(userId);

    logger.info({ recommendationId }, 'llamando a groq');

    const result = await generateRecommendation(likedMovies, previouslyRecommended);

    logger.info({ recommendationId, result }, 'respuesta de groq validada');

    const movies = result.map((movie) => ({ tmdbMovieId: movie.tmdbMovieId, reason: movie.reason }));

    await completeRecommendation(recommendationId, movies);

    logger.info({ recommendationId, movies }, 'recomendacion completada');
  } catch (err) {
    // si quedan intentos relanza para que bullmq reintente; en el ultimo intento marca failed
    const maxAttempts = job.opts.attempts ?? 1;

    if (job.attemptsMade < maxAttempts - 1) {
      logger.warn(
        { err, recommendationId, userId, attemptsMade: job.attemptsMade },
        'fallo el procesamiento de la recomendacion, se reintentara',
      );
      throw err;
    }

    // intentar con modelo fallback antes de marcar failed
    // si fallo antes de armar el contexto (likes o tmdb) no hay con que llamar a groq
    if (likedMovies) {
      try {
        const fallbackResult = await generateRecommendation(likedMovies, previouslyRecommended, GROQ_FALLBACK_MODEL);
        const movies = fallbackResult.map((movie) => ({ tmdbMovieId: movie.tmdbMovieId, reason: movie.reason }));

        await completeRecommendation(recommendationId, movies);

        logger.info({ recommendationId, fallbackModel: GROQ_FALLBACK_MODEL }, 'recomendacion completada con modelo fallback');
        return;
      } catch (fallbackErr) {
        logger.error(
          { err: fallbackErr, recommendationId, userId, fallbackModel: GROQ_FALLBACK_MODEL },
          'fallo tambien el modelo fallback',
        );
      }
    }

    logger.error(
      { err, recommendationId, userId, attemptsMade: job.attemptsMade },
      'fallo el procesamiento de la recomendacion, se agotaron los reintentos, se marca como failed',
    );
    await failRecommendation(recommendationId);
  }
}



export const recommendationWorker = new Worker<RecommendationJobData>(
  RECOMMENDATIONS_QUEUE_NAME,
  processRecommendationJob,
  {
    connection: redisConnection,
    // conservador para el free tier de groq: 28 jobs por minuto
    limiter: { max: GROQ_RATE_LIMIT_MAX, duration: GROQ_RATE_LIMIT_WINDOW_MS },
  },
);

logger.info('worker de recomendaciones arrancado');



async function shutdownWorker(signal: string) {
  logger.info({ signal }, 'señal recibida, iniciando apagado prolijo del worker');

  try {
    // espera a que terminen los jobs en curso antes de cerrar la conexion
    await recommendationWorker.close();
    logger.info('worker de recomendaciones cerrado');

    await redisConnection.quit();
    logger.info('conexion a redis cerrada');

    await prisma.$disconnect();
    logger.info('conexion a prisma cerrada');

    logger.info('apagado prolijo del worker completo');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'error durante el apagado prolijo del worker');
    process.exit(1);
  }
}



process.on('SIGTERM', () => {
  shutdownWorker('SIGTERM');
});
