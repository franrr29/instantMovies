import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { MovieCard } from '../components/MovieCard';
import { LikeIcon } from '../components/ui/LikeIcon';
import { btnSecondary, inputClasses, likeButtonIdle, likeButtonLiked, sectionHeading } from '../components/ui/styles';
import { useDebounce } from '../hooks/useDebounce';
import { cn } from '../lib/cn';
import { addLike, getLikes, removeLike } from '../services/likesService';
import { getTrendingMovies, searchMovies } from '../services/moviesService';
import type { Movie } from '../types';



const DEBOUNCE_MS = 400;
const PAGE_SIZE = 12;



interface ToggleLikeVariables {
  movie: Movie;
  isLiked: boolean;
}



export function MovieList() {
  const [searchInput, setSearchInput] = useState('');
  const debouncedQuery = useDebounce(searchInput, DEBOUNCE_MS).trim();
  const isSearching = debouncedQuery.length > 0;
  const [page, setPage] = useState(1);

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

  // evita quedar en una pagina vacia al cambiar de busqueda/trending
  useEffect(() => {
    setPage(1);
  }, [isSearching, debouncedQuery]);

  if (moviesQuery.isLoading || likesQuery.isLoading) {
    return <div className="py-24 text-center text-sm text-ink/60">Cargando...</div>;
  }

  if (moviesQuery.isError) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <p className="text-sm text-ink/70">Ocurrió un error al cargar las películas.</p>
        <button onClick={() => moviesQuery.refetch()} className={btnSecondary}>
          Reintentar
        </button>
      </div>
    );
  }

  const movies = moviesQuery.data ?? [];
  const likedIds = new Set(likesQuery.data?.map((like) => like.tmdbMovieId) ?? []);

  const totalPages = Math.max(1, Math.ceil(movies.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedMovies = movies.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function isToggling(movieId: number): boolean {
    return toggleLikeMutation.isPending && toggleLikeMutation.variables?.movie.id === movieId;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className={cn(sectionHeading, 'text-3xl sm:text-4xl')}>Películas</h1>
        <input
          type="text"
          placeholder="Buscar películas..."
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          className={cn(inputClasses, 'sm:w-80')}
        />
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="font-display text-xl">
          {isSearching ? `Resultados para '${debouncedQuery}'` : 'Tendencias de la semana'}
        </h2>

        {isSearching && movies.length === 0 && (
          <p className="text-sm text-ink/60">No se encontraron películas para &apos;{debouncedQuery}&apos;</p>
        )}

        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {paginatedMovies.map((movie) => {
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
                  className={isLiked ? likeButtonLiked : likeButtonIdle}
                >
                  <LikeIcon liked={isLiked} /> {isLiked ? 'Liked' : 'Like'}
                </button>
              </MovieCard>
            );
          })}
        </div>

        {movies.length > PAGE_SIZE && (
          <div className="flex items-center justify-center gap-4 pt-4">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={cn(btnSecondary, 'px-4 py-2 text-xs')}
            >
              ← Anterior
            </button>
            <span className="font-display text-xs uppercase tracking-[0.2em] text-ink/60">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className={cn(btnSecondary, 'px-4 py-2 text-xs')}
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
