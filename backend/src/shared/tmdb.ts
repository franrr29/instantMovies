import { z } from 'zod';

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

export type TmdbMovie = z.infer<typeof tmdbMovieSchema>;

function getApiKey(): string {
  const apiKey = process.env.TMDB_API_KEY;

  if (!apiKey) {
    throw new Error('falta configurar la variable de entorno TMDB_API_KEY');
  }

  return apiKey;
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

export async function getPopularMovies(page = 1): Promise<TmdbMovie[]> {
  return fetchFromTmdb('/movie/popular', { page: String(page) });
}

export async function searchMovies(query: string, page = 1): Promise<TmdbMovie[]> {
  return fetchFromTmdb('/search/movie', { query, page: String(page) });
}
