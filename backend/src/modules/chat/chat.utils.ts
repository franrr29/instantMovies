import { z } from 'zod';
import { ChatMessageRole } from '../../generated/prisma/client';
import type { ChatMessageRecord } from './chat.repository';

// las raices aceptan sufijo (recomendame, buscame); el resto es palabra completa con plural opcional.
// "dame" solo cuenta en "dame mas" / "dame algo" para no matchear "dame un momento"
const MOVIE_REQUEST_STEMS = ['recomend', 'pelicul', 'film', 'busca', 'sugeri'];
const MOVIE_REQUEST_WORDS = ['movie', 'terror', 'comedia', 'accion', 'thriller', 'drama', 'otra'];
const MOVIE_REQUEST_REGEX = new RegExp(
  [
    `\\b(?:${MOVIE_REQUEST_STEMS.join('|')})\\w*`,
    `\\b(?:${MOVIE_REQUEST_WORDS.join('|')})s?\\b`,
    '\\bdame\\s+(?:mas|algo)\\b',
  ].join('|'),
);

// search_movie devuelve una pelicula suelta y discover_movies una lista
const toolMovieSchema = z.object({ id: z.number(), title: z.string() });
const toolMoviesResultSchema = z.union([z.array(toolMovieSchema), toolMovieSchema.transform((movie) => [movie])]);

const compactMoviesSchema = z.array(z.object({ tmdbId: z.number() }));

export function asksForMovies(message: string): boolean {
  const normalized = message
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return MOVIE_REQUEST_REGEX.test(normalized);
}

export function collectSeenMovieIds(history: ChatMessageRecord[]): number[] {
  return history
    .filter((entry) => entry.role === ChatMessageRole.TOOL)
    .flatMap((entry) => {
      try {
        const parsed = compactMoviesSchema.safeParse(JSON.parse(entry.content));
        return parsed.success ? parsed.data.map((movie) => movie.tmdbId) : [];
      } catch {
        return [];
      }
    });
}

// los turnos anteriores solo necesitan id y titulo (el resto son tokens de mas); lo que no sea
// una pelicula o lista de peliculas (ej. { error }) queda tal cual
export function compactToolResult(content: string): string {
  try {
    const parsed = toolMoviesResultSchema.safeParse(JSON.parse(content));

    if (!parsed.success) {
      return content;
    }

    return JSON.stringify(parsed.data.map((movie) => ({ tmdbId: movie.id, title: movie.title })));
  } catch {
    return content;
  }
}
