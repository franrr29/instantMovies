import type Groq from 'groq-sdk';
import { logger } from '../../shared/logger';
import { type TmdbMovie, discoverMovies, searchMovies } from '../../shared/tmdb';

const DISCOVER_MAX_PAGES = 3;

// si tmdb falla, el modelo recibe igual un resultado de tool y responde sin romper el chat
function toolFailedResult(err: unknown, toolName: string): string {
  logger.warn(
    { err, cause: err instanceof Error ? err.cause : undefined, toolName },
    'fallo la busqueda en tmdb desde una tool del chat',
  );
  return JSON.stringify({ error: 'no se pudo buscar en tmdb en este momento' });
}

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
  excludedMovieIds: number[] = [],
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
    const filters = {
      genreIds: Array.isArray(toolArgs.with_genres)
        ? (toolArgs.with_genres as number[])
        : undefined,
      primaryReleaseYear:
        typeof toolArgs.primary_release_year === 'number' ? toolArgs.primary_release_year : undefined,
      minRating:
        typeof toolArgs['vote_average.gte'] === 'number' ? (toolArgs['vote_average.gte'] as number) : undefined,
    };

    const excluded = new Set(excludedMovieIds);
    let results: TmdbMovie[] = [];

    // las peliculas que el usuario ya vio en el historial no se repiten; si una pagina queda vacia tras filtrar,
    // se pide la siguiente (hasta DISCOVER_MAX_PAGES) para encontrar resultados nuevos
    try {
      for (let page = 1; page <= DISCOVER_MAX_PAGES && results.length === 0; page += 1) {
        const found = await discoverMovies(filters, page);

        if (found.length === 0) {
          break;
        }

        results = found.filter((movie) => !excluded.has(movie.id)).slice(0, 5);
      }
    } catch (err) {
      return toolFailedResult(err, toolCall.function.name);
    }

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

  let results: TmdbMovie[];

  try {
    results = await searchMovies(toolArgs.title);
  } catch (err) {
    return toolFailedResult(err, toolCall.function.name);
  }

  const [found] = results;

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
