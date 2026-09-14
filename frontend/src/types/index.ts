export interface User {
  id: number;
  username: string;
}

export interface Movie {
  id: number;
  tmdbId: number;
  title: string;
  overview: string;
  posterPath: string;
  releaseDate: string;
  voteAverage: number;
}

export interface Like {
  id: number;
  tmdbId: number;
  title: string;
  posterPath: string;
  createdAt: string;
}

export type RecommendationStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export interface Recommendation {
  id: number;
  status: RecommendationStatus;
  tmdbMovieId: number | null;
  reason: string | null;
  createdAt: string;
}

export type ChatMessageRole = 'user' | 'assistant';

export interface ChatMessage {
  role: ChatMessageRole;
  content: string;
  movies?: Movie[];
}
