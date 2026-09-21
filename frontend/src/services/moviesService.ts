import { api } from './api';
import type { Movie } from '../types';



export async function getTrendingMovies(): Promise<Movie[]> {
  const response = await api.get<Movie[]>('/movies/trending');
  return response.data;
}



export async function searchMovies(query: string): Promise<Movie[]> {
  const response = await api.get<Movie[]>('/movies', { params: { query } });
  return response.data;
}
