import type { ReactNode } from 'react';

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
    <div>
      {posterPath ? (
        <img src={`${TMDB_IMAGE_BASE_URL}${posterPath}`} alt={title} />
      ) : (
        <div>sin poster</div>
      )}
      <h3>{title}</h3>
      {voteAverage !== undefined && <p>rating: {voteAverage}</p>}
      <p>{truncateOverview(overview)}</p>
      {children}
    </div>
  );
}
