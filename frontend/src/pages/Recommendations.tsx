import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MovieCard } from '../components/MovieCard';
import { PosterFallback } from '../components/ui/PosterFallback';
import { btnPrimary, eyebrowLabel, sectionHeading, tagOutline } from '../components/ui/styles';
import { TypingDots } from '../components/ui/TypingDots';
import { cn } from '../lib/cn';
import { getLikes } from '../services/likesService';
import { getRecommendations, requestRecommendation } from '../services/recommendationsService';
import type { Recommendation, RecommendationStatus } from '../types';

const POLL_INTERVAL_MS = 3000;

function hasPendingRecommendation(recommendations: Recommendation[] | undefined): boolean {
  return recommendations?.some((recommendation) => recommendation.status === 'PENDING') ?? false;
}

function StatusBadge({ status }: { status: RecommendationStatus }) {
  if (status === 'FAILED') {
    return <span className={cn(tagOutline, 'border-red-400 text-red-300')}>FAILED</span>;
  }
  if (status === 'PENDING') {
    return <span className="font-display text-[10px] uppercase tracking-[0.22em] text-ink/50">PENDING</span>;
  }
  return <span className={tagOutline}>COMPLETED</span>;
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
    return <div className="py-24 text-center text-sm text-ink/60">Cargando...</div>;
  }

  if (likesQuery.isError || recommendationsQuery.isError) {
    return (
      <div className="py-24 text-center text-sm text-ink/70">Ocurrió un error al cargar las recomendaciones.</div>
    );
  }

  const hasLikes = (likesQuery.data?.length ?? 0) > 0;
  const recommendations = recommendationsQuery.data ?? [];
  const canRequest = hasLikes && !hasPendingRecommendation(recommendations) && !requestMutation.isPending;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-divider pb-8">
        <div>
          <p className={eyebrowLabel}>The projectionist</p>
          <h1 className={cn(sectionHeading, 'mt-2 text-3xl sm:text-4xl')}>Recomendaciones</h1>
          {!hasLikes && (
            <p className="mt-3 text-sm text-ink/70">
              Dale like a algunas películas primero.{' '}
              <Link to="/movies" className="text-accent hover:underline">
                Ver películas
              </Link>
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          <button onClick={() => requestMutation.mutate()} disabled={!canRequest} className={btnPrimary}>
            {requestMutation.isPending ? 'Pidiendo...' : 'Pedir recomendaciones →'}
          </button>
          {requestMutation.isError && (
            <p className="text-xs text-red-400">No se pudo pedir la recomendación. Intentá de nuevo.</p>
          )}
        </div>
      </div>

      {hasLikes && recommendations.length === 0 && (
        <p className="text-sm text-ink/60">Todavía no pediste recomendaciones.</p>
      )}

      <div className="flex flex-col gap-10">
        {recommendations.map((recommendation) => (
          <section key={recommendation.id} className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-ink/50">{new Date(recommendation.createdAt).toLocaleString()}</p>
              <StatusBadge status={recommendation.status} />
            </div>

            {recommendation.status === 'PENDING' && (
              <div className="flex items-center gap-4 border border-divider px-5 py-4">
                <TypingDots />
                <p className="font-display text-xs uppercase tracking-[0.2em] text-accent">
                  Analizando tus gustos...
                </p>
              </div>
            )}

            {recommendation.status === 'FAILED' && (
              <p className="border border-red-400/40 bg-red-400/10 px-5 py-4 text-sm text-red-300">
                No pudimos generar recomendaciones, intentá de nuevo.
              </p>
            )}

            {recommendation.status === 'COMPLETED' && recommendation.movies && (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                {recommendation.movies.map((movie) =>
                  movie.title ? (
                    <MovieCard
                      key={movie.tmdbMovieId}
                      title={movie.title}
                      overview={movie.overview}
                      posterPath={movie.posterPath}
                      voteAverage={movie.voteAverage}
                    >
                      <div className="border-t border-divider pt-3">
                        <p className="mb-1.5 font-display text-[10px] uppercase tracking-[0.2em] text-accent">
                          Why this pick
                        </p>
                        <p className="text-xs leading-relaxed text-ink/75">{movie.reason}</p>
                      </div>
                    </MovieCard>
                  ) : (
                    <div key={movie.tmdbMovieId} className="flex flex-col gap-3 border border-divider p-4">
                      <div className="aspect-[2/3] bg-surface">
                        <PosterFallback>Sin datos de esta película</PosterFallback>
                      </div>
                      <p className="text-xs leading-relaxed text-ink/75">{movie.reason}</p>
                    </div>
                  ),
                )}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
