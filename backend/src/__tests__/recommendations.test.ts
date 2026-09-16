// tests unitarios de recommendations.service: sin likes, pending duplicado, enriquecimiento parcial TMDB, validacion respuesta groq
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RecommendationStatus } from '../generated/prisma/client';
import { groqRecommendationSchema } from '../shared/groq';

vi.mock('../modules/likes/likes.repository', () => ({
  getLikesByUser: vi.fn(),
}));

vi.mock('../modules/recommendations/recommendations.repository', () => ({
  createRecommendation: vi.fn(),
  getRecommendationsByUser: vi.fn(),
  getRecommendationByIdForUser: vi.fn(),
  completeRecommendation: vi.fn(),
  failRecommendation: vi.fn(),
}));

vi.mock('../queue/recommendationQueue', () => ({
  recommendationQueue: { add: vi.fn() },
}));

vi.mock('../shared/tmdb', () => ({
  getMovieById: vi.fn(),
}));

import { getLikesByUser } from '../modules/likes/likes.repository';
import {
  createRecommendation,
  getRecommendationByIdForUser,
  getRecommendationsByUser,
} from '../modules/recommendations/recommendations.repository';
import { recommendationQueue } from '../queue/recommendationQueue';
import { getMovieById } from '../shared/tmdb';
import {
  RecommendationsServiceError,
  getUserRecommendationById,
  requestRecommendation,
} from '../modules/recommendations/recommendations.service';

function fakeTmdbMovie(tmdbMovieId: number) {
  return {
    id: tmdbMovieId,
    title: `Pelicula ${tmdbMovieId}`,
    overview: `overview de ${tmdbMovieId}`,
    release_date: '2020-01-01',
    poster_path: `/poster-${tmdbMovieId}.jpg`,
    vote_average: 7.5,
    genres: [],
  };
}

describe('recommendations.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('requestRecommendation', () => {
    it('lanza RecommendationsServiceError con code NO_LIKES cuando el usuario no tiene likes', async () => {
      vi.mocked(getLikesByUser).mockResolvedValue([]);

      const promise = requestRecommendation(1);

      await expect(promise).rejects.toBeInstanceOf(RecommendationsServiceError);
      await expect(promise).rejects.toMatchObject({ code: 'NO_LIKES' });
    });

    it('lanza RecommendationsServiceError con code PENDING_ALREADY_EXISTS cuando ya hay una rec pending', async () => {
      vi.mocked(getLikesByUser).mockResolvedValue([{ id: 1, userId: 1, tmdbMovieId: 27205, createdAt: new Date() }]);
      vi.mocked(getRecommendationsByUser).mockResolvedValue([
        { id: 10, userId: 1, movies: null, status: RecommendationStatus.PENDING, createdAt: new Date() },
      ]);

      const promise = requestRecommendation(1);

      await expect(promise).rejects.toBeInstanceOf(RecommendationsServiceError);
      await expect(promise).rejects.toMatchObject({ code: 'PENDING_ALREADY_EXISTS' });
    });

    it('crea la recomendacion y encola el job cuando pasa las validaciones', async () => {
      vi.mocked(getLikesByUser).mockResolvedValue([{ id: 1, userId: 1, tmdbMovieId: 27205, createdAt: new Date() }]);
      vi.mocked(getRecommendationsByUser).mockResolvedValue([]);

      const created = {
        id: 10,
        userId: 1,
        movies: null,
        status: RecommendationStatus.PENDING,
        createdAt: new Date(),
      };
      vi.mocked(createRecommendation).mockResolvedValue(created);

      const result = await requestRecommendation(1);

      expect(result).toEqual(created);
      expect(recommendationQueue.add).toHaveBeenCalledWith(
        'generate-recommendation',
        { recommendationId: 10, userId: 1 },
        expect.objectContaining({ attempts: 3 }),
      );
    });
  });

  describe('enriquecimiento parcial (TMDB falla en 1 de 3 peliculas)', () => {
    it('getUserRecommendationById devuelve las 3: 2 completas y 1 con datos minimos', async () => {
      vi.mocked(getRecommendationByIdForUser).mockResolvedValue({
        id: 5,
        userId: 1,
        status: RecommendationStatus.COMPLETED,
        createdAt: new Date(),
        movies: [
          { tmdbMovieId: 1, reason: 'razon 1' },
          { tmdbMovieId: 2, reason: 'razon 2' },
          { tmdbMovieId: 3, reason: 'razon 3' },
        ],
      });

      vi.mocked(getMovieById).mockImplementation(async (tmdbMovieId: number) => {
        if (tmdbMovieId === 2) {
          throw new Error('tmdb esta caido');
        }
        return fakeTmdbMovie(tmdbMovieId);
      });

      const result = await getUserRecommendationById(5, 1);

      expect(result.movies).toHaveLength(3);
      expect(result.movies?.[0]).toMatchObject({ tmdbMovieId: 1, reason: 'razon 1', title: 'Pelicula 1' });
      expect(result.movies?.[1]).toMatchObject({
        tmdbMovieId: 2,
        reason: 'razon 2',
        title: '',
        overview: '',
        posterPath: null,
        voteAverage: 0,
      });
      expect(result.movies?.[2]).toMatchObject({ tmdbMovieId: 3, reason: 'razon 3', title: 'Pelicula 3' });
    });
  });

  describe('groqRecommendationSchema (respuesta malformada de groq)', () => {
    it('rechaza un objeto al que le falta el campo movies', () => {
      const result = groqRecommendationSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rechaza cuando el array no tiene exactamente 3 peliculas', () => {
      const result = groqRecommendationSchema.safeParse({
        movies: [{ title: 'A', tmdbMovieId: 1, reason: 'x' }],
      });
      expect(result.success).toBe(false);
    });

    it('rechaza cuando tmdbMovieId no es un numero', () => {
      const result = groqRecommendationSchema.safeParse({
        movies: [
          { title: 'A', tmdbMovieId: 'no-es-numero', reason: 'x' },
          { title: 'B', tmdbMovieId: 2, reason: 'y' },
          { title: 'C', tmdbMovieId: 3, reason: 'z' },
        ],
      });
      expect(result.success).toBe(false);
    });
  });
});
