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

export async function getUserLikes(userId: number): Promise<LikeRecord[]> {
  return getLikesByUser(userId);
}
