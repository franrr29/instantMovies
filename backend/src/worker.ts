import { Worker, type Job } from 'bullmq';
import Groq from 'groq-sdk';
import { z } from 'zod';
import { getLikesByUser } from './modules/likes/likes.repository';
import {completeRecommendation,failRecommendation,
} from './modules/recommendations/recommendations.repository';
import { redisConnection } from './queue/recommendationQueue';
import { logger } from './shared/logger';
import { getMovieById } from './shared/tmdb';

interface RecommendationJobData {
  recommendationId: number;
  userId: number;
}

const groqRecommendationSchema = z.object({
  title: z.string(),
  tmdbMovieId: z.number(),
  reason: z.string(),
});

function getGroqApiKey(): string {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('falta configurar la variable de entorno GROQ_API_KEY');
  }

  return apiKey;
}

const groq = new Groq({ apiKey: getGroqApiKey() });

function buildPrompt(likedMovies: { id: number; title: string; genres: string[] }[]): string {
  const likedList = likedMovies
    .map((movie) => `- (tmdbMovieId: ${movie.id}) ${movie.title} — generos: ${movie.genres.join(', ') || 'sin genero'}`)
    .join('\n');

  const likedIds = likedMovies.map((movie) => movie.id).join(', ');

  return [
    'Sos un sistema de recomendacion de peliculas.',
    'El usuario marco como "me gusta" estas peliculas:',
    likedList,
    '',
    `No recomiendes ninguna pelicula cuyo tmdbMovieId este en esta lista: ${likedIds}.`,
    'Recomenda UNA sola pelicula distinta que el usuario probablemente disfrute, dado ese gusto.',
    'Respondé unicamente con un JSON valido, sin texto adicional ni markdown, con esta forma exacta:',
    '{ "title": "...", "tmdbMovieId": number, "reason": "..." }',
  ].join('\n');
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

    const prompt = buildPrompt(likedMovies);

    logger.info({ recommendationId }, 'llamando a groq');

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const rawContent = completion.choices[0]?.message?.content ?? '';

    logger.info({ recommendationId, rawContent }, 'respuesta de groq recibida');

    const result = groqRecommendationSchema.parse(JSON.parse(rawContent));

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
