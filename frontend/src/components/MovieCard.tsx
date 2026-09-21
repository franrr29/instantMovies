import type { ReactNode } from 'react';

import { PosterFallback } from './ui/PosterFallback';



const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w342';
const OVERVIEW_TRUNCATE_LENGTH = 240;



export interface MovieCardProps {
  title: string;
  overview: string;
  posterPath: string | null;
  voteAverage?: number;
  children?: ReactNode;
}



function truncateOverview(overview: string): string {
  if (overview.length <= OVERVIEW_TRUNCATE_LENGTH) return overview;
  return `${overview.slice(0, OVERVIEW_TRUNCATE_LENGTH).trimEnd()}…`;
}



export function MovieCard({ title, overview, posterPath, voteAverage, children }: MovieCardProps) {
  return (
    <div className="flex flex-col border border-divider">
      <div className="relative aspect-[2/3] bg-surface">
        {posterPath ? (
          <img
            src={`${TMDB_IMAGE_BASE_URL}${posterPath}`}
            alt={title}
            className="h-full w-full object-cover"
          />
        ) : (
          <PosterFallback>Sin poster</PosterFallback>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-display text-base leading-tight">{title}</h3>

        {voteAverage !== undefined && (
          <p className="font-display text-xs tracking-wide text-accent">★ {voteAverage.toFixed(1)}</p>
        )}

        <p className="flex-1 text-xs leading-relaxed text-ink/70">{truncateOverview(overview)}</p>

        {children}
      </div>
    </div>
  );
}
