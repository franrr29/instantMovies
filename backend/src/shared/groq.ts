import Groq from 'groq-sdk';
import { z } from 'zod';
import { env } from './env';

const groqMovieSchema = z.object({
  title: z.string(),
  tmdbMovieId: z.number(),
  reason: z.string(),
});

// groq (modo response_format json_object) exige que la raiz del JSON sea un
// objeto, no un array; se pide {"movies": [...]} y se transforma al array
// de 3 peliculas que consume el resto del sistema
export const groqRecommendationSchema = z
  .object({
    movies: z.array(groqMovieSchema).length(3),
  })
  .transform((data) => data.movies);

export type GroqRecommendation = z.infer<typeof groqRecommendationSchema>;

export const groq = new Groq({ apiKey: env.GROQ_API_KEY });

function buildPrompt(likedMovies: { id: number; title: string; genres: string[] }[]): string {
  const likedList = likedMovies
    .map((movie) => `- (tmdbMovieId: ${movie.id}) ${movie.title} — generos: ${movie.genres.join(', ') || 'sin genero'}`)
    .join('\n');

  const likedIds = likedMovies.map((movie) => movie.id).join(', ');

  return [
    'Sos un sistema de recomendacion de peliculas.',
    'El usuario marco como "me gusta" estas peliculas:',
    likedList,
    '',
    `No recomiendes ninguna pelicula cuyo tmdbMovieId este en esta lista: ${likedIds}.`,
    'Recomenda 3 peliculas distintas que el usuario probablemente disfrute, dado ese gusto.',
    'Respondé unicamente con un JSON valido, sin texto adicional ni markdown, con esta forma exacta:',
    '{ "movies": [ { "title": "...", "tmdbMovieId": number, "reason": "..." }, { "title": "...", "tmdbMovieId": number, "reason": "..." }, { "title": "...", "tmdbMovieId": number, "reason": "..." } ] }',
  ].join('\n');
}

export async function generateRecommendation(
  likedMovies: { id: number; title: string; genres: string[] }[],
): Promise<GroqRecommendation> {
  const prompt = buildPrompt(likedMovies);

  const completion = await groq.chat.completions.create({
    model: 'qwen/qwen3.8-27b',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_tokens: 600,
  });

  const rawContent = completion.choices[0]?.message?.content ?? '';

  return groqRecommendationSchema.parse(JSON.parse(rawContent));
}
