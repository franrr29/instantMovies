import { z } from 'zod';
import { env } from './env';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

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

//si no paso url, se obtiene la primera página de películas populares por defecto
export async function getPopularMovies(page = 1): Promise<TmdbMovie[]> {
  return fetchFromTmdb('/movie/popular', { page: String(page) });
}

// le dice a fetch que busque películas que coincidan con el query proporcionado
export async function searchMovies(query: string, page = 1): Promise<TmdbMovie[]> {
  return fetchFromTmdb('/search/movie', { query, page: String(page) });
}

// peliculas en tendencia de la semana; es el catalogo inicial cuando el usuario
// todavia no escribio ninguna busqueda
export async function getTrendingMovies(page = 1): Promise<TmdbMovie[]> {
  return fetchFromTmdb('/trending/movie/week', { page: String(page) });
}

export async function getMovieById(tmdbMovieId: number): Promise<TmdbMovieDetails> {
  const url = new URL(`${TMDB_BASE_URL}/movie/${tmdbMovieId}`);
  url.searchParams.set('api_key', getApiKey());

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`tmdb respondio con status ${response.status}`);
  }

  const body = await response.json();
  return tmdbMovieDetailsSchema.parse(body);
}
