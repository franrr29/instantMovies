// tests unitarios de Recommendations: sin likes, PENDING con polling, COMPLETED con 3 MovieCards, FAILED
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/recommendationsService', () => ({
  getRecommendations: vi.fn(),
  getRecommendationById: vi.fn(),
  requestRecommendation: vi.fn(),
}));

vi.mock('../services/likesService', () => ({
  getLikes: vi.fn(),
  addLike: vi.fn(),
  removeLike: vi.fn(),
}));

import { getLikes } from '../services/likesService';
import { getRecommendations } from '../services/recommendationsService';
import { Recommendations } from '../pages/Recommendations';
import type { Like, Recommendation } from '../types';

function fakeLike(tmdbMovieId: number): Like {
  return {
    tmdbMovieId,
    title: `Pelicula ${tmdbMovieId}`,
    overview: 'overview',
    posterPath: null,
    voteAverage: 7,
    createdAt: new Date().toISOString(),
  };
}

function renderRecommendations() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Recommendations />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Recommendations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // usuario sin likes: no tiene sentido dejarlo pedir una recomendacion
  it('sin likes: muestra el mensaje y deshabilita el boton de pedir', async () => {
    vi.mocked(getLikes).mockResolvedValue([]);
    vi.mocked(getRecommendations).mockResolvedValue([]);

    renderRecommendations();

    expect(await screen.findByText(/Dale like a algunas películas primero/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pedir recomendaciones/ })).toBeDisabled();
  });

  // hay un pedido en curso: se ve el indicador de espera y no se puede pedir otro
  it('estado PENDING: muestra el indicador de loading y deshabilita el boton', async () => {
    vi.mocked(getLikes).mockResolvedValue([fakeLike(1)]);
    vi.mocked(getRecommendations).mockResolvedValue([
      { id: 1, userId: 1, status: 'PENDING', createdAt: new Date().toISOString(), movies: null },
    ]);

    renderRecommendations();

    expect(await screen.findByText('Analizando tus gustos...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pedir recomendaciones/ })).toBeDisabled();
  });

  // recomendacion resuelta: las 3 peliculas se muestran con su titulo y el reason del LLM
  it('estado COMPLETED: renderiza 3 MovieCards con titulo y reason', async () => {
    vi.mocked(getLikes).mockResolvedValue([fakeLike(1)]);

    const movies: Recommendation['movies'] = [
      { tmdbMovieId: 10, reason: 'razon 1', title: 'Pelicula A', overview: 'ov a', posterPath: null, voteAverage: 7 },
      { tmdbMovieId: 20, reason: 'razon 2', title: 'Pelicula B', overview: 'ov b', posterPath: null, voteAverage: 8 },
      { tmdbMovieId: 30, reason: 'razon 3', title: 'Pelicula C', overview: 'ov c', posterPath: null, voteAverage: 9 },
    ];

    vi.mocked(getRecommendations).mockResolvedValue([
      { id: 1, userId: 1, status: 'COMPLETED', createdAt: new Date().toISOString(), movies },
    ]);

    renderRecommendations();

    for (const movie of movies) {
      expect(await screen.findByText(movie.title)).toBeInTheDocument();
      expect(screen.getByText(movie.reason)).toBeInTheDocument();
    }
  });

  // el worker marco la rec como fallida: se avisa al usuario, no se rompe la pantalla
  it('estado FAILED: muestra el mensaje de error', async () => {
    vi.mocked(getLikes).mockResolvedValue([fakeLike(1)]);
    vi.mocked(getRecommendations).mockResolvedValue([
      { id: 1, userId: 1, status: 'FAILED', createdAt: new Date().toISOString(), movies: null },
    ]);

    renderRecommendations();

    expect(await screen.findByText('No pudimos generar recomendaciones, intentá de nuevo.')).toBeInTheDocument();
  });
});
