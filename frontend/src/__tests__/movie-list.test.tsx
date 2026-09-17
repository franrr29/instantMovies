// tests unitarios de MovieList: trending inicial, busqueda con debounce, toggle like
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/moviesService', () => ({
  getTrendingMovies: vi.fn(),
  searchMovies: vi.fn(),
}));

vi.mock('../services/likesService', () => ({
  getLikes: vi.fn(),
  addLike: vi.fn(),
  removeLike: vi.fn(),
}));

import { addLike, getLikes } from '../services/likesService';
import { getTrendingMovies, searchMovies } from '../services/moviesService';
import { MovieList } from '../pages/MovieList';
import type { Movie } from '../types';

function fakeMovie(id: number, title: string): Movie {
  return {
    id,
    title,
    overview: `overview de ${title}`,
    release_date: '2020-01-01',
    poster_path: null,
    vote_average: 7.5,
  };
}

function renderMovieList() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MovieList />
    </QueryClientProvider>,
  );
}

describe('MovieList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // sin busqueda activa, la pantalla arranca mostrando las trending
  it('trending como estado inicial: renderiza MovieCards con los titulos', async () => {
    const trending = [fakeMovie(1, 'Resident Evil'), fakeMovie(2, 'Moana')];
    vi.mocked(getTrendingMovies).mockResolvedValue(trending);
    vi.mocked(getLikes).mockResolvedValue([]);

    renderMovieList();

    for (const movie of trending) {
      expect(await screen.findByText(movie.title)).toBeInTheDocument();
    }
    expect(getTrendingMovies).toHaveBeenCalled();
  });

  // escribir no debe disparar la request en cada tecla, solo cuando se frena el debounce
  it('busqueda con debounce: no llama a la API hasta que pasa el delay', async () => {
    const trendingMovie = fakeMovie(1, 'Resident Evil');
    const searchResult = fakeMovie(603, 'The Matrix');

    vi.mocked(getTrendingMovies).mockResolvedValue([trendingMovie]);
    vi.mocked(getLikes).mockResolvedValue([]);
    vi.mocked(searchMovies).mockResolvedValue([searchResult]);

    renderMovieList();
    await screen.findByText(trendingMovie.title);

    vi.useFakeTimers();

    const input = screen.getByPlaceholderText('Buscar películas...');
    fireEvent.change(input, { target: { value: 'matrix' } });

    // deja correr el useEffect del debounce (que registra el setTimeout) antes de avanzar
    await vi.advanceTimersByTimeAsync(0);
    expect(searchMovies).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(searchMovies).toHaveBeenCalledWith('matrix');

    // dos vueltas mas de microtareas para que la resolucion de la query
    // (dispatch de exito de TanStack Query) termine de propagarse al render
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    vi.useRealTimers();

    expect(await screen.findByText(searchResult.title)).toBeInTheDocument();
  });

  // click en "Like" pega al backend y, tras el refetch de /likes, el boton cambia a "Liked"
  it('toggle like: click en el boton llama a POST /likes y despues muestra estado likeado', async () => {
    const movie = fakeMovie(1, 'Resident Evil');
    vi.mocked(getTrendingMovies).mockResolvedValue([movie]);
    vi.mocked(getLikes)
      .mockResolvedValueOnce([])
      .mockResolvedValue([
        {
          tmdbMovieId: movie.id,
          title: movie.title,
          overview: movie.overview,
          posterPath: movie.poster_path,
          voteAverage: movie.vote_average,
          createdAt: new Date().toISOString(),
        },
      ]);
    vi.mocked(addLike).mockResolvedValue(undefined);

    const user = userEvent.setup();
    renderMovieList();

    await screen.findByText(movie.title);
    expect(screen.getByRole('button', { name: /like$/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /like$/i }));

    expect(addLike).toHaveBeenCalledWith(movie.id);
    expect(await screen.findByRole('button', { name: /liked$/i })).toBeInTheDocument();
  });
});
