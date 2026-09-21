import { getMovieById } from '../../shared/tmdb';
import {
  ALREADY_LIKED_MESSAGE,
  LIKE_NOT_FOUND_MESSAGE,
  addLike as addLikeToDb,
  getLikesByUser,
  removeLike as removeLikeFromDb,
  type LikeRecord,
} from './likes.repository';



type LikesErrorCode = 'ALREADY_LIKED' | 'LIKE_NOT_FOUND';



// el controller decide el status http a partir de este code, el service no sabe de http
export class LikesServiceError extends Error {
  code: LikesErrorCode;

  constructor(code: LikesErrorCode, message: string) {
    super(message);
    this.name = 'LikesServiceError';
    this.code = code;
  }
}



export interface EnrichedLike {
  tmdbMovieId: number;
  title: string;
  overview: string;
  posterPath: string | null;
  voteAverage: number;
  createdAt: Date;
}



// mismo patron de resiliencia que enrichRecommendation en recommendations.service.ts:
// si TMDB falla para una pelicula, se devuelven datos minimos en vez de romper el enriquecimiento
async function enrichLike(like: LikeRecord): Promise<EnrichedLike> {
  try {
    const tmdbMovie = await getMovieById(like.tmdbMovieId);
    return {
      tmdbMovieId: like.tmdbMovieId,
      title: tmdbMovie.title,
      overview: tmdbMovie.overview,
      posterPath: tmdbMovie.poster_path,
      voteAverage: tmdbMovie.vote_average,
      createdAt: like.createdAt,
    };
  } catch {
    return {
      tmdbMovieId: like.tmdbMovieId,
      title: '',
      overview: '',
      posterPath: null,
      voteAverage: 0,
      createdAt: like.createdAt,
    };
  }
}



export async function addLike(userId: number, tmdbMovieId: number): Promise<LikeRecord> {
  try {
    return await addLikeToDb(userId, tmdbMovieId);
  } catch (err) {
    if (err instanceof Error && err.message === ALREADY_LIKED_MESSAGE) {
      throw new LikesServiceError('ALREADY_LIKED', err.message);
    }
    throw err;
  }
}



export async function removeLike(userId: number, tmdbMovieId: number): Promise<void> {
  try {
    await removeLikeFromDb(userId, tmdbMovieId);
  } catch (err) {
    if (err instanceof Error && err.message === LIKE_NOT_FOUND_MESSAGE) {
      throw new LikesServiceError('LIKE_NOT_FOUND', err.message);
    }
    throw err;
  }
}



export async function getUserLikes(userId: number): Promise<EnrichedLike[]> {
  const likes = await getLikesByUser(userId);
  return Promise.all(likes.map(enrichLike));
}
