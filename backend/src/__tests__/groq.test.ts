// tests unitarios de generateRecommendation: resolucion de titulos a IDs reales de TMDB
import { beforeEach, describe, expect, it, vi } from 'vitest';



const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));

vi.mock('groq-sdk', () => ({
  default: class {
    chat = { completions: { create: createMock } };
  },
}));

vi.mock('../shared/tmdb', () => ({
  searchMovies: vi.fn(),
}));



import { generateRecommendation } from '../shared/groq';
import { searchMovies } from '../shared/tmdb';



const likedMovies = [{ id: 27205, title: 'Inception', genres: ['Accion'] }];



function groqReplies(movies: { title: string; reason: string }[]) {
  createMock.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ movies }) } }] });
}



function tmdbResult(id: number) {
  return [{ id, title: `Pelicula ${id}`, overview: '', release_date: '', poster_path: null, vote_average: 0 }];
}



const threeMovies = [
  { title: 'A', reason: 'razon a' },
  { title: 'B', reason: 'razon b' },
  { title: 'C', reason: 'razon c' },
];

describe('generateRecommendation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('el prompt lista los titulos de los likes y no pide ni menciona tmdbMovieId', async () => {
    groqReplies(threeMovies);
    vi.mocked(searchMovies).mockResolvedValue(tmdbResult(1));

    await generateRecommendation(likedMovies);

    const prompt = createMock.mock.calls[0][0].messages[0].content as string;
    expect(prompt).toContain('Inception');
    expect(prompt).not.toContain('tmdbMovieId');
    expect(prompt).not.toContain('27205');
  });

  it('toma el primer resultado de TMDB como match y devuelve el ID real', async () => {
    groqReplies(threeMovies);
    vi.mocked(searchMovies).mockImplementation(async (title) => {
      const ids: Record<string, number> = { A: 10, B: 20, C: 30 };
      return [...tmdbResult(ids[title]), ...tmdbResult(999)];
    });

    const result = await generateRecommendation(likedMovies);

    expect(result).toEqual([
      { title: 'A', tmdbMovieId: 10, reason: 'razon a' },
      { title: 'B', tmdbMovieId: 20, reason: 'razon b' },
      { title: 'C', tmdbMovieId: 30, reason: 'razon c' },
    ]);
  });

  it('descarta el titulo sin resultados en TMDB y el que hace fallar la busqueda, conserva el resto', async () => {
    groqReplies(threeMovies);
    vi.mocked(searchMovies).mockImplementation(async (title) => {
      if (title === 'A') return [];
      if (title === 'B') throw new Error('tmdb esta caido');
      return tmdbResult(30);
    });

    const result = await generateRecommendation(likedMovies);

    expect(result).toEqual([{ title: 'C', tmdbMovieId: 30, reason: 'razon c' }]);
  });

  it('lanza si TMDB no resuelve ninguna pelicula', async () => {
    groqReplies(threeMovies);
    vi.mocked(searchMovies).mockResolvedValue([]);

    await expect(generateRecommendation(likedMovies)).rejects.toThrow('ninguna');
  });
});
