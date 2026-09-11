import { getPopularMovies, searchMovies, type TmdbMovie } from '../../shared/tmdb';

export async function listMovies(query?: string, page?: number): Promise<TmdbMovie[]> {
  if (query) {
    return searchMovies(query, page);
  }

  return getPopularMovies(page);
}
