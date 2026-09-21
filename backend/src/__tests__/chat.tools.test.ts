// tests unitarios de chat.tools.executeTool: exclusion de peliculas ya vistas y paginacion en discover_movies
import type Groq from 'groq-sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';



vi.mock('../shared/tmdb', () => ({
  discoverMovies: vi.fn(),
  searchMovies: vi.fn(),
}));

vi.mock('../shared/logger', () => ({
  logger: { warn: vi.fn() },
}));



import { executeTool } from '../modules/chat/chat.tools';
import { discoverMovies, searchMovies } from '../shared/tmdb';



const makeMovie = (id: number) => ({
  id,
  title: `Peli ${id}`,
  overview: 'overview',
  release_date: '2020-01-01',
  poster_path: null,
  vote_average: 7,
});



const makeToolCall = (name: string, args: object): Groq.Chat.ChatCompletionMessageToolCall => ({
  id: 'call_1',
  type: 'function',
  function: { name, arguments: JSON.stringify(args) },
});



const resultIds = (content: string) => (JSON.parse(content) as { id: number }[]).map((movie) => movie.id);



describe('chat.tools executeTool discover_movies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('excluye de los resultados las peliculas ya vistas', async () => {
    vi.mocked(discoverMovies).mockResolvedValue([makeMovie(1), makeMovie(2), makeMovie(3)]);
    const movies: Parameters<typeof executeTool>[1] = [];

    const content = await executeTool(makeToolCall('discover_movies', { with_genres: [27] }), movies, [1, 3]);

    expect(resultIds(content)).toEqual([2]);
    expect(movies.map((movie) => movie.tmdbId)).toEqual([2]);
    expect(discoverMovies).toHaveBeenCalledTimes(1);
  });

  it('pide la pagina siguiente si al filtrar no queda nada', async () => {
    vi.mocked(discoverMovies)
      .mockResolvedValueOnce([makeMovie(1), makeMovie(2)])
      .mockResolvedValueOnce([makeMovie(3), makeMovie(4)]);

    const content = await executeTool(makeToolCall('discover_movies', { with_genres: [27] }), [], [1, 2, 3]);

    expect(resultIds(content)).toEqual([4]);
    expect(discoverMovies).toHaveBeenCalledTimes(2);
    expect(vi.mocked(discoverMovies).mock.calls[1]?.[1]).toBe(2);
  });

  it('corta en la pagina 3 y devuelve error si todo era repetido', async () => {
    vi.mocked(discoverMovies).mockResolvedValue([makeMovie(1)]);

    const content = await executeTool(makeToolCall('discover_movies', { with_genres: [27] }), [], [1]);

    expect(JSON.parse(content)).toEqual({ error: 'no se encontraron resultados en tmdb' });
    expect(discoverMovies).toHaveBeenCalledTimes(3);
    expect(vi.mocked(discoverMovies).mock.calls.map((call) => call[1])).toEqual([1, 2, 3]);
  });

  it('no pide mas paginas si tmdb ya no devuelve resultados', async () => {
    vi.mocked(discoverMovies).mockResolvedValueOnce([makeMovie(1)]).mockResolvedValueOnce([]);

    const content = await executeTool(makeToolCall('discover_movies', {}), [], [1]);

    expect(JSON.parse(content)).toEqual({ error: 'no se encontraron resultados en tmdb' });
    expect(discoverMovies).toHaveBeenCalledTimes(2);
  });

  it('devuelve un resultado de error, sin lanzar, si tmdb falla', async () => {
    vi.mocked(discoverMovies).mockRejectedValue(new Error('fetch failed'));

    const content = await executeTool(makeToolCall('discover_movies', {}), [], []);

    expect(JSON.parse(content)).toEqual({ error: 'no se pudo buscar en tmdb en este momento' });
  });
});

describe('chat.tools executeTool search_movie', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no filtra por peliculas ya vistas (busqueda puntual por titulo)', async () => {
    vi.mocked(searchMovies).mockResolvedValue([makeMovie(1)]);

    const content = await executeTool(makeToolCall('search_movie', { title: 'Peli 1' }), [], [1]);

    expect(JSON.parse(content)).toMatchObject({ id: 1, title: 'Peli 1' });
  });
});
