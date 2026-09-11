import { Prisma } from '../../generated/prisma/client';
import { prisma } from '../../shared/db';

export interface LikeRecord {
  id: number;
  userId: number;
  tmdbMovieId: number;
  createdAt: Date;
}

// mensajes que el service reconoce para traducirlos a LikesServiceError
export const ALREADY_LIKED_MESSAGE = 'pelicula ya marcada como me gusta';
export const LIKE_NOT_FOUND_MESSAGE = 'like no encontrado';

export async function addLike(userId: number, tmdbMovieId: number): Promise<LikeRecord> {
  try {
    return await prisma.like.create({ data: { userId, tmdbMovieId } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new Error(ALREADY_LIKED_MESSAGE);
    }
    throw err;
  }
}

export async function removeLike(userId: number, tmdbMovieId: number): Promise<void> {
  try {
    await prisma.like.delete({
      where: { userId_tmdbMovieId: { userId, tmdbMovieId } },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new Error(LIKE_NOT_FOUND_MESSAGE);
    }
    throw err;
  }
}

export async function getLikesByUser(userId: number): Promise<LikeRecord[]> {
  return prisma.like.findMany({ where: { userId } });
}
