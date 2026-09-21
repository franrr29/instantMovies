import { api } from './api';
import type { Like } from '../types';



export async function getLikes(): Promise<Like[]> {
  const response = await api.get<Like[]>('/likes');
  return response.data;
}



// backend/src/modules/likes/likes.schemas.ts: addLikeSchema solo exige tmdbMovieId.
// POST /likes devuelve el like crudo (sin enriquecer con TMDB) y nadie usa la
// respuesta hoy, asi que no vale la pena tipearla aparte del shape de Like.
export async function addLike(tmdbMovieId: number): Promise<void> {
  await api.post('/likes', { tmdbMovieId });
}



export async function removeLike(tmdbMovieId: number): Promise<void> {
  await api.delete(`/likes/${tmdbMovieId}`);
}
