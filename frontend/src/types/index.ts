export interface User {
  id: number;
  username: string;
}

// forma cruda que devuelve TMDB (backend/shared/tmdb.ts), /movies y /movies/trending
// la pasan sin transformar
export interface Movie {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  poster_path: string | null;
  vote_average: number;
}

// backend/src/modules/likes/likes.service.ts: GET /likes devuelve cada like
// enriquecido con TMDB (title/overview/posterPath/voteAverage vacios si TMDB fallo)
export interface Like {
  tmdbMovieId: number;
  title: string;
  overview: string;
  posterPath: string | null;
  voteAverage: number;
  createdAt: string;
}

export type RecommendationStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export interface RecommendedMovie {
  tmdbMovieId: number;
  reason: string;
  title: string;
  overview: string;
  posterPath: string | null;
  voteAverage: number;
}

export interface Recommendation {
  id: number;
  userId: number;
  status: RecommendationStatus;
  createdAt: string;
  movies: RecommendedMovie[] | null;
}

export type ChatMessageRole = 'user' | 'assistant';

// backend/src/modules/chat/chat.tools.ts: ChatMovieResult, distinto shape del
// resto de la app (tmdbId en vez de tmdbMovieId, rating en vez de voteAverage)
export interface ChatMovieResult {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  rating: number;
  overview: string;
}

export interface ChatMessage {
  role: ChatMessageRole;
  content: string;
  movies?: ChatMovieResult[];
}
