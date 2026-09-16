import { RecommendationStatus } from '../../generated/prisma/client';
import type { Prisma } from '../../generated/prisma/client';
import { prisma } from '../../shared/db';

export interface RecommendedMovie {
  tmdbMovieId: number;
  reason: string;
}

export interface RecommendationRecord {
  id: number;
  userId: number;
  movies: RecommendedMovie[] | null;
  status: RecommendationStatus;
  createdAt: Date;
}

export async function createRecommendation(userId: number): Promise<RecommendationRecord> {
  return prisma.recommendation.create({
    data: {
      userId,
      status: RecommendationStatus.PENDING,
      movies: undefined,
    },
  }) as Promise<RecommendationRecord>;
}

export async function completeRecommendation(
  id: number,
  movies: RecommendedMovie[],
): Promise<RecommendationRecord> {
  return prisma.recommendation.update({
    where: { id },
    data: { status: RecommendationStatus.COMPLETED, movies: movies as unknown as Prisma.InputJsonValue },
  }) as Promise<RecommendationRecord>;
}

export async function failRecommendation(id: number): Promise<RecommendationRecord> {
  return prisma.recommendation.update({
    where: { id },
    data: { status: RecommendationStatus.FAILED },
  }) as Promise<RecommendationRecord>;
}

export async function getRecommendationsByUser(userId: number): Promise<RecommendationRecord[]> {
  return prisma.recommendation.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  }) as Promise<RecommendationRecord[]>;
}

export async function getRecommendationByIdForUser(
  id: number,
  userId: number,
): Promise<RecommendationRecord | null> {
  return prisma.recommendation.findFirst({
    where: { id, userId },
  }) as Promise<RecommendationRecord | null>;
}
