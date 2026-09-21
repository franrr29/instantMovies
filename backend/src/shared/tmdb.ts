import { z } from 'zod';

import { env } from './env';
import { logger } from './logger';



const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_TIMEOUT_MS = 5000;
const TMDB_MAX_ATTEMPTS = 2;
const TMDB_RETRY_DELAY_MS = 1000;

const tmdbMovieSchema = z.object({
  id: z.number(),
  title: z.string(),
  overview: z.string(),
  release_date: z.string(),
  poster_path: z.string().nullable(),
  vote_average: z.number(),
});

const tmdbPaginatedResponseSchema = z.object({
  page: z.number(),
  results: z.array(tmdbMovieSchema),
  total_pages: z.number(),
  total_results: z.number(),
});

const tmdbGenreSchema = z.object({
  id: z.number(),
  name: z.string(),
});

// /movie/{id} devuelve, ademas de los campos base, la lista de generos completa
// (a diferencia de /movie/popular y /search/movie, que solo traen genre_ids)
const tmdbMovieDetailsSchema = tmdbMovieSchema.extend({
  genres: z.array(tmdbGenreSchema),
});



export type TmdbMovie = z.infer<typeof tmdbMovieSchema>;
export type TmdbMovieDetails = z.infer<typeof tmdbMovieDetailsSchema>;



function getApiKey(): string {
  return env.TMDB_API_KEY;
}



async function fetchFromTmdb(path: string, params: Record<string, string>): Promise<TmdbMovie[]> {
  const url = new URL(`${TMDB_BASE_URL}${path}`);
  url.searchParams.set('api_key', getApiKey());

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`tmdb respondio con status ${response.status}`);
  }

  const body = await response.json();
  return tmdbPaginatedResponseSchema.parse(body).results;
}



// sin page, devuelve la primera pagina de peliculas populares
export async function getPopularMovies(page = 1): Promise<TmdbMovie[]> {
  return fetchFromTmdb('/movie/popular', { page: String(page) });
}



// le dice a fetch que busque peliculas que coincidan con el query proporcionado
export async function searchMovies(query: string, page = 1): Promise<TmdbMovie[]> {
  return fetchFromTmdb('/search/movie', { query, page: String(page) });
}



// peliculas en tendencia de la semana; es el catalogo inicial cuando el usuario
// todavia no escribio ninguna busqueda
export async function getTrendingMovies(page = 1): Promise<TmdbMovie[]> {
  return fetchFromTmdb('/trending/movie/week', { page: String(page) });
}



export interface DiscoverMoviesFilters {
  genreIds?: number[];
  primaryReleaseYear?: number;
  minRating?: number;
}



// busqueda por filtros (genero, año, rating minimo) en vez de por titulo,
// usada por la tool discover_movies del chat
export async function discoverMovies(filters: DiscoverMoviesFilters, page = 1): Promise<TmdbMovie[]> {
  const params: Record<string, string> = { page: String(page) };

  if (filters.genreIds && filters.genreIds.length > 0) {
    params.with_genres = filters.genreIds.join(',');
  }

  if (filters.primaryReleaseYear) {
    params.primary_release_year = String(filters.primaryReleaseYear);
  }

  if (filters.minRating !== undefined) {
    params['vote_average.gte'] = String(filters.minRating);
  }

  return fetchFromTmdb('/discover/movie', params);
}



function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}



// reintenta solo fallos de red/timeout (fetch lanza); los status http no-ok se manejan aguas abajo
async function fetchMovieWithRetry(url: URL, tmdbMovieId: number): Promise<Response> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await fetch(url, { signal: AbortSignal.timeout(TMDB_TIMEOUT_MS) });
    } catch (err) {
      logger.warn({ err, cause: err instanceof Error ? err.cause : undefined, tmdbMovieId, attempt }, 'fallo el fetch a tmdb');

      if (attempt >= TMDB_MAX_ATTEMPTS) {
        throw err;
      }

      await delay(TMDB_RETRY_DELAY_MS);
    }
  }
}



export async function getMovieById(tmdbMovieId: number): Promise<TmdbMovieDetails> {
  const url = new URL(`${TMDB_BASE_URL}/movie/${tmdbMovieId}`);
  url.searchParams.set('api_key', getApiKey());

  const response = await fetchMovieWithRetry(url, tmdbMovieId);

  if (!response.ok) {
    throw new Error(`tmdb respondio con status ${response.status}`);
  }

  const body = await response.json();
  return tmdbMovieDetailsSchema.parse(body);
}
