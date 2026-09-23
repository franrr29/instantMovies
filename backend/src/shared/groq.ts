import Groq from 'groq-sdk';
import { z } from 'zod';

import { GROQ_MODEL } from './constants';
import { env } from './env';
import { logger } from './logger';
import { searchMovies } from './tmdb';



const RECOMMENDATION_MAX_TOKENS = 600;

// groq solo devuelve titulo y razon: los LLMs no conocen los IDs de TMDB y los
// inventan, asi que el ID real se resuelve despues buscando el titulo en TMDB
const groqMovieSchema = z.object({
  title: z.string(),
  reason: z.string(),
});

// groq (modo response_format json_object) exige que la raiz del JSON sea un
// objeto, no un array; se pide {"movies": [...]} y se transforma al array
// de 3 peliculas que consume el resto del sistema
export const groqRecommendationSchema = z
  .object({
    movies: z.array(groqMovieSchema).length(3),
  })
  .transform((data) => data.movies);

export const groq = new Groq({
  apiKey: env.GROQ_API_KEY,
  ...(env.HELICONE_API_KEY
    ? {
        baseURL: 'https://groq.helicone.ai',
        defaultHeaders: {
          'Helicone-Auth': `Bearer ${env.HELICONE_API_KEY}`,
        },
      }
    : {}),
});


function buildPrompt(likedMovies: { id: number; title: string; genres: string[] }[]): string {
  const likedList = likedMovies
    .map((movie) => `- ${movie.title} — generos: ${movie.genres.join(', ') || 'sin genero'}`)
    .join('\n');

  return [
    'Sos un sistema de recomendacion de peliculas.',
    'El usuario marco como "me gusta" estas peliculas:',
    likedList,
    '',
    'No recomiendes ninguna pelicula que ya este en esa lista.',
    'Recomenda 3 peliculas distintas que el usuario probablemente disfrute, dado ese gusto.',
    'Respondé unicamente con un JSON valido, sin texto adicional ni markdown, con esta forma exacta:',
    '{ "movies": [ { "title": "...", "reason": "..." }, { "title": "...", "reason": "..." }, { "title": "...", "reason": "..." } ] }',
  ].join('\n');
}



export interface ResolvedRecommendation {
  title: string;
  tmdbMovieId: number;
  reason: string;
}



export async function generateRecommendation(
  likedMovies: { id: number; title: string; genres: string[] }[],
  model?: string,
): Promise<ResolvedRecommendation[]> {
  const prompt = buildPrompt(likedMovies);

  const completion = await groq.chat.completions.create(
    {
      model: model ?? GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: RECOMMENDATION_MAX_TOKENS,
    },
    env.HELICONE_API_KEY ? { headers: { 'Helicone-Property-Type': 'recommendation' } } : {},
  );

  const rawContent = completion.choices[0]?.message?.content ?? '';

  const recommended = groqRecommendationSchema.parse(JSON.parse(rawContent));

  // allSettled: que falle la busqueda de un titulo no tira las demas
  const searches = await Promise.allSettled(recommended.map((movie) => searchMovies(movie.title)));

  const resolved: ResolvedRecommendation[] = [];

  searches.forEach((search, index) => {
    const { title, reason } = recommended[index];

    if (search.status === 'rejected') {
      logger.warn({ err: search.reason, title }, 'fallo la busqueda en tmdb, se descarta la pelicula');
      return;
    }

    const match = search.value[0];

    if (!match) {
      logger.warn({ title }, 'tmdb no encontro la pelicula recomendada, se descarta');
      return;
    }

    resolved.push({ title, tmdbMovieId: match.id, reason });
  });

  // sin ninguna pelicula resuelta no hay nada valido que persistir: se lanza
  // para que el worker reintente / marque failed en vez de guardar una lista vacia
  if (resolved.length === 0) {
    throw new Error('tmdb no pudo resolver ninguna de las peliculas recomendadas por groq');
  }

  return resolved;
}
