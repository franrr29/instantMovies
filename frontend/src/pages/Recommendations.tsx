import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MovieCard } from '../components/MovieCard';
import { getLikes } from '../services/likesService';
import { getRecommendations, requestRecommendation } from '../services/recommendationsService';
import type { Recommendation } from '../types';

const POLL_INTERVAL_MS = 3000;

function hasPendingRecommendation(recommendations: Recommendation[] | undefined): boolean {
  return recommendations?.some((recommendation) => recommendation.status === 'PENDING') ?? false;
}

export function Recommendations() {
  const queryClient = useQueryClient();

  const likesQuery = useQuery({
    queryKey: ['likes'],
    queryFn: getLikes,
  });

  const recommendationsQuery = useQuery({
    queryKey: ['recommendations'],
    queryFn: getRecommendations,
    refetchInterval: (query) => (hasPendingRecommendation(query.state.data) ? POLL_INTERVAL_MS : false),
  });

  const requestMutation = useMutation({
    mutationFn: requestRecommendation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    },
  });

  if (likesQuery.isLoading || recommendationsQuery.isLoading) {
    return <div>Cargando...</div>;
  }

  if (likesQuery.isError || recommendationsQuery.isError) {
    return <div>Ocurrió un error al cargar las recomendaciones.</div>;
  }

  const hasLikes = (likesQuery.data?.length ?? 0) > 0;
  const recommendations = recommendationsQuery.data ?? [];
  const canRequest = hasLikes && !hasPendingRecommendation(recommendations) && !requestMutation.isPending;

  return (
    <div>
      <h1>Recomendaciones</h1>

      {!hasLikes && (
        <p>
          Dale like a algunas películas primero. <Link to="/movies">Ver películas</Link>
        </p>
      )}

      <button onClick={() => requestMutation.mutate()} disabled={!canRequest}>
        {requestMutation.isPending ? 'Pidiendo...' : 'Pedir recomendaciones'}
      </button>

      {requestMutation.isError && <p>No se pudo pedir la recomendación. Intentá de nuevo.</p>}

      {hasLikes && recommendations.length === 0 && <p>Todavía no pediste recomendaciones.</p>}

      {recommendations.map((recommendation) => (
        <section key={recommendation.id}>
          <p>{new Date(recommendation.createdAt).toLocaleString()}</p>

          {recommendation.status === 'PENDING' && <p>Analizando tus gustos...</p>}

          {recommendation.status === 'FAILED' && <p>No pudimos generar recomendaciones, intentá de nuevo.</p>}

          {recommendation.status === 'COMPLETED' && recommendation.movies && (
            <div>
              {recommendation.movies.map((movie) =>
                movie.title ? (
                  <MovieCard
                    key={movie.tmdbMovieId}
                    title={movie.title}
                    overview={movie.overview}
                    posterPath={movie.posterPath}
                    voteAverage={movie.voteAverage}
                  >
                    <p>{movie.reason}</p>
                  </MovieCard>
                ) : (
                  <div key={movie.tmdbMovieId}>
                    <div>sin datos de esta película</div>
                    <p>{movie.reason}</p>
                  </div>
                ),
              )}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
