import { RecommendationStatus } from '../../generated/prisma/client';
import { prisma } from '../../shared/db';

export interface RecommendationRecord {
  id: number;
  userId: number;
  tmdbMovieId: number | null;
  reason: string | null;
  status: RecommendationStatus;
  createdAt: Date;
}

export async function createRecommendation(userId: number): Promise<RecommendationRecord> {
  return prisma.recommendation.create({
    data: {
      userId,
      status: RecommendationStatus.PENDING,
      tmdbMovieId: null,
      reason: null,
    },
  });
}

export async function completeRecommendation(
  id: number,
  tmdbMovieId: number,
  reason: string,
): Promise<RecommendationRecord> {
  return prisma.recommendation.update({
    where: { id },
    data: { status: RecommendationStatus.COMPLETED, tmdbMovieId, reason },
  });
}

export async function failRecommendation(id: number): Promise<RecommendationRecord> {
  return prisma.recommendation.update({
    where: { id },
    data: { status: RecommendationStatus.FAILED },
  });
}

export async function getRecommendationsByUser(userId: number): Promise<RecommendationRecord[]> {
  return prisma.recommendation.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}
