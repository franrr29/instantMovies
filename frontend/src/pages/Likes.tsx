import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { MovieCard } from '../components/MovieCard';
import { LikeIcon } from '../components/ui/LikeIcon';
import { PosterFallback } from '../components/ui/PosterFallback';
import { btnSecondary, likeButtonLiked, sectionHeading } from '../components/ui/styles';
import { cn } from '../lib/cn';
import { getLikes, removeLike } from '../services/likesService';



export function Likes() {
  const queryClient = useQueryClient();

  const likesQuery = useQuery({
    queryKey: ['likes'],
    queryFn: getLikes,
  });

  const removeLikeMutation = useMutation({
    mutationFn: (tmdbMovieId: number) => removeLike(tmdbMovieId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['likes'] });
    },
  });

  function isRemoving(tmdbMovieId: number): boolean {
    return removeLikeMutation.isPending && removeLikeMutation.variables === tmdbMovieId;
  }

  if (likesQuery.isLoading) {
    return <div className="py-24 text-center text-sm text-ink/60">Cargando...</div>;
  }

  if (likesQuery.isError) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <p className="text-sm text-ink/70">Ocurrió un error al cargar tus likes.</p>
        <button onClick={() => likesQuery.refetch()} className={btnSecondary}>
          Reintentar
        </button>
      </div>
    );
  }

  const likes = likesQuery.data ?? [];

  if (likes.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className={cn(sectionHeading, 'text-3xl sm:text-4xl')}>Mis películas favoritas</h1>
        <p className="text-sm text-ink/70">
          Todavía no tenés películas favoritas.{' '}
          <Link to="/movies" className="text-accent hover:underline">
            Explorar películas
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className={cn(sectionHeading, 'text-3xl sm:text-4xl')}>Mis películas favoritas</h1>

      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {likes.map((like) => {
          const removeButton = (
            <button
              disabled={isRemoving(like.tmdbMovieId)}
              onClick={() => removeLikeMutation.mutate(like.tmdbMovieId)}
              className={likeButtonLiked}
            >
              <LikeIcon liked /> Quitar like
            </button>
          );

          if (!like.title) {
            return (
              <div key={like.tmdbMovieId} className="flex flex-col gap-3 border border-divider p-4">
                <div className="aspect-[2/3] bg-surface">
                  <PosterFallback>Sin poster</PosterFallback>
                </div>
                {removeButton}
              </div>
            );
          }

          return (
            <MovieCard
              key={like.tmdbMovieId}
              title={like.title}
              overview={like.overview}
              posterPath={like.posterPath}
              voteAverage={like.voteAverage}
            >
              {removeButton}
            </MovieCard>
          );
        })}
      </div>
    </div>
  );
}
