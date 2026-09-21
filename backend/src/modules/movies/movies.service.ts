import { getPopularMovies, getTrendingMovies, searchMovies, type TmdbMovie } from '../../shared/tmdb';



export async function listMovies(query?: string, page?: number): Promise<TmdbMovie[]> {
  if (query) {
    return searchMovies(query, page);
  }

  return getPopularMovies(page);
}



export async function listTrendingMovies(page?: number): Promise<TmdbMovie[]> {
  return getTrendingMovies(page);
}
