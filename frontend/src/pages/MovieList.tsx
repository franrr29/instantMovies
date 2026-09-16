import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { MovieCard } from '../components/MovieCard';
import { useDebounce } from '../hooks/useDebounce';
import { addLike, getLikes, removeLike } from '../services/likesService';
import { getTrendingMovies, searchMovies } from '../services/moviesService';
import type { Movie } from '../types';

const DEBOUNCE_MS = 400;

interface ToggleLikeVariables {
  movie: Movie;
  isLiked: boolean;
}

export function MovieList() {
  const [searchInput, setSearchInput] = useState('');
  const debouncedQuery = useDebounce(searchInput, DEBOUNCE_MS).trim();
  const isSearching = debouncedQuery.length > 0;

  const queryClient = useQueryClient();

  const moviesQuery = useQuery({
    queryKey: isSearching ? ['movies', 'search', debouncedQuery] : ['movies', 'trending'],
    queryFn: () => (isSearching ? searchMovies(debouncedQuery) : getTrendingMovies()),
  });

  const likesQuery = useQuery({
    queryKey: ['likes'],
    queryFn: getLikes,
  });

  const toggleLikeMutation = useMutation({
    mutationFn: async ({ movie, isLiked }: ToggleLikeVariables): Promise<void> => {
      if (isLiked) {
        await removeLike(movie.id);
      } else {
        await addLike(movie.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['likes'] });
    },
  });

  if (moviesQuery.isLoading || likesQuery.isLoading) {
    return <div>Cargando...</div>;
  }

  if (moviesQuery.isError) {
    return (
      <div>
        <p>Ocurrió un error al cargar las películas.</p>
        <button onClick={() => moviesQuery.refetch()}>Reintentar</button>
      </div>
    );
  }

  const movies = moviesQuery.data ?? [];
  const likedIds = new Set(likesQuery.data?.map((like) => like.tmdbMovieId) ?? []);

  function isToggling(movieId: number): boolean {
    return toggleLikeMutation.isPending && toggleLikeMutation.variables?.movie.id === movieId;
  }

  return (
    <div>
      <h1>Películas</h1>

      <input
        type="text"
        placeholder="Buscar películas..."
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
      />

      <h2>{isSearching ? `Resultados para '${debouncedQuery}'` : 'Tendencias de la semana'}</h2>

      {isSearching && movies.length === 0 && <p>No se encontraron películas para '{debouncedQuery}'</p>}

      <div>
        {movies.map((movie) => {
          const isLiked = likedIds.has(movie.id);

          return (
            <MovieCard
              key={movie.id}
              title={movie.title}
              overview={movie.overview}
              posterPath={movie.poster_path}
              voteAverage={movie.vote_average}
            >
              <button
                disabled={isToggling(movie.id)}
                onClick={() => toggleLikeMutation.mutate({ movie, isLiked })}
              >
                {isLiked ? '♥ likeada' : '♡ dar like'}
              </button>
            </MovieCard>
          );
        })}
      </div>
    </div>
  );
}
