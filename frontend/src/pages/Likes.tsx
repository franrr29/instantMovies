import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MovieCard } from '../components/MovieCard';
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
    return <div>Cargando...</div>;
  }

  if (likesQuery.isError) {
    return (
      <div>
        <p>Ocurrió un error al cargar tus likes.</p>
        <button onClick={() => likesQuery.refetch()}>Reintentar</button>
      </div>
    );
  }

  const likes = likesQuery.data ?? [];

  if (likes.length === 0) {
    return (
      <div>
        <h1>Mis películas favoritas</h1>
        <p>
          Todavía no tenés películas favoritas. <Link to="/movies">Explorar películas</Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1>Mis películas favoritas</h1>

      <div>
        {likes.map((like) => {
          const removeButton = (
            <button disabled={isRemoving(like.tmdbMovieId)} onClick={() => removeLikeMutation.mutate(like.tmdbMovieId)}>
              Quitar like
            </button>
          );

          if (!like.title) {
            return (
              <div key={like.tmdbMovieId}>
                <div>sin poster</div>
                <p>tmdbMovieId: {like.tmdbMovieId}</p>
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
