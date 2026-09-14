import type Groq from 'groq-sdk';
import { discoverMovies, searchMovies } from '../../shared/tmdb';

export interface ChatMovieResult {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  rating: number;
  overview: string;
}

//tool que busca peliculas en TMDB por titulo:
export const searchMovieTool: Groq.Chat.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'search_movie',
    description:
      'Busca una pelicula puntual en TMDB por titulo para obtener datos reales (id, poster, rating, overview). Usala cuando el usuario menciona un titulo especifico (ej: "buscame Inception").',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
      },
      required: ['title'],
    },
  },
};

//tool que busca peliculas en TMDB por filtros (genero, año, rating), en vez de por titulo:
export const discoverMovieTool: Groq.Chat.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'discover_movies',
    description:
      'Busca peliculas en TMDB por filtros cuando el usuario describe un tipo de pelicula en vez de nombrar un titulo (ej: "quiero un thriller del 2020", "una comedia bien valorada"). No la uses si el usuario menciona un titulo puntual: para eso esta search_movie.',
    parameters: {
      type: 'object',
      properties: {
        with_genres: {
          type: 'array',
          items: { type: 'number' },
          description: 'IDs de genero de TMDB (ej: 28 accion, 35 comedia, 27 terror, 18 drama, 53 thriller).',
        },
        primary_release_year: {
          type: 'number',
          description: 'Año de estreno exacto de las peliculas buscadas.',
        },
        'vote_average.gte': {
          type: 'number',
          description: 'Rating minimo (escala de 0 a 10).',
        },
      },
    },
  },
};

// ejecuta la tool que haya elegido el modelo (search_movie o discover_movies) y
// devuelve el content que se le manda de vuelta como resultado de la tool call
export async function executeTool(
  toolCall: Groq.Chat.ChatCompletionMessageToolCall,
  movies: ChatMovieResult[],
): Promise<string> {
  let toolArgs: Record<string, unknown> | null;

  try {
    toolArgs = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
  } catch {
    toolArgs = null;
  }

  if (!toolArgs) {
    return JSON.stringify({ error: 'argumentos invalidos' });
  }

  if (toolCall.function.name === 'discover_movies') {
    const found = await discoverMovies({
      genreIds: Array.isArray(toolArgs.with_genres)
        ? (toolArgs.with_genres as number[])
        : undefined,
      primaryReleaseYear:
        typeof toolArgs.primary_release_year === 'number' ? toolArgs.primary_release_year : undefined,
      minRating:
        typeof toolArgs['vote_average.gte'] === 'number' ? (toolArgs['vote_average.gte'] as number) : undefined,
    });

    const results = found.slice(0, 5);

    movies.push(
      ...results.map((movie) => ({
        tmdbId: movie.id,
        title: movie.title,
        posterPath: movie.poster_path,
        rating: movie.vote_average,
        overview: movie.overview,
      })),
    );

    //para que el llm use como resultado en su respuesta al usuario
    return JSON.stringify(results.length > 0 ? results : { error: 'no se encontraron resultados en tmdb' });
  }

  // default: search_movie
  if (typeof toolArgs.title !== 'string') {
    return JSON.stringify({ error: 'argumentos invalidos' });
  }

  const [found] = await searchMovies(toolArgs.title);

  if (found) {
    movies.push({
      tmdbId: found.id,
      title: found.title,
      posterPath: found.poster_path,
      rating: found.vote_average,
      overview: found.overview,
    });
  }

  return JSON.stringify(found ?? { error: 'no se encontraron resultados en tmdb' });
}
