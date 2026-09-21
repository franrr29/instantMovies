// tests unitarios de likes.service: like duplicado, like no encontrado, enriquecimiento parcial TMDB
import { beforeEach, describe, expect, it, vi } from 'vitest';



vi.mock('../modules/likes/likes.repository', () => ({
  ALREADY_LIKED_MESSAGE: 'pelicula ya marcada como me gusta',
  LIKE_NOT_FOUND_MESSAGE: 'like no encontrado',
  addLike: vi.fn(),
  removeLike: vi.fn(),
  getLikesByUser: vi.fn(),
}));

vi.mock('../shared/tmdb', () => ({
  getMovieById: vi.fn(),
}));



import {
  ALREADY_LIKED_MESSAGE,
  LIKE_NOT_FOUND_MESSAGE,
  addLike as addLikeToDb,
  getLikesByUser,
  removeLike as removeLikeFromDb,
} from '../modules/likes/likes.repository';
import { getMovieById } from '../shared/tmdb';
import { LikesServiceError, addLike, getUserLikes, removeLike } from '../modules/likes/likes.service';



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



describe('likes.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addLike', () => {
    it('lanza LikesServiceError con code ALREADY_LIKED cuando el like ya existe', async () => {
      vi.mocked(addLikeToDb).mockRejectedValue(new Error(ALREADY_LIKED_MESSAGE));

      const promise = addLike(1, 27205);

      await expect(promise).rejects.toBeInstanceOf(LikesServiceError);
      await expect(promise).rejects.toMatchObject({ code: 'ALREADY_LIKED' });
    });
  });

  describe('removeLike', () => {
    it('lanza LikesServiceError con code LIKE_NOT_FOUND cuando el like no existe', async () => {
      vi.mocked(removeLikeFromDb).mockRejectedValue(new Error(LIKE_NOT_FOUND_MESSAGE));

      const promise = removeLike(1, 27205);

      await expect(promise).rejects.toBeInstanceOf(LikesServiceError);
      await expect(promise).rejects.toMatchObject({ code: 'LIKE_NOT_FOUND' });
    });
  });

  describe('getUserLikes (enriquecimiento parcial)', () => {
    it('devuelve todos los likes: los que se enriquecieron completos y el que fallo con datos minimos', async () => {
      vi.mocked(getLikesByUser).mockResolvedValue([
        { id: 1, userId: 1, tmdbMovieId: 10, createdAt: new Date('2026-01-01') },
        { id: 2, userId: 1, tmdbMovieId: 20, createdAt: new Date('2026-01-02') },
        { id: 3, userId: 1, tmdbMovieId: 30, createdAt: new Date('2026-01-03') },
      ]);

      vi.mocked(getMovieById).mockImplementation(async (tmdbMovieId: number) => {
        if (tmdbMovieId === 20) {
          throw new Error('tmdb esta caido');
        }
        return fakeTmdbMovie(tmdbMovieId);
      });

      const result = await getUserLikes(1);

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({ tmdbMovieId: 10, title: 'Pelicula 10', posterPath: '/poster-10.jpg' });
      expect(result[1]).toMatchObject({
        tmdbMovieId: 20,
        title: '',
        overview: '',
        posterPath: null,
        voteAverage: 0,
      });
      expect(result[2]).toMatchObject({ tmdbMovieId: 30, title: 'Pelicula 30', posterPath: '/poster-30.jpg' });
    });
  });
});
