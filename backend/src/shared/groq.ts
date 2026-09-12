import Groq from 'groq-sdk';
import { z } from 'zod';

export const groqRecommendationSchema = z.object({
  title: z.string(),
  tmdbMovieId: z.number(),
  reason: z.string(),
});

export type GroqRecommendation = z.infer<typeof groqRecommendationSchema>;

function getGroqApiKey(): string {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('falta configurar la variable de entorno GROQ_API_KEY');
  }

  return apiKey;
}

const groq = new Groq({ apiKey: getGroqApiKey() });

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
    'Recomenda UNA sola pelicula distinta que el usuario probablemente disfrute, dado ese gusto.',
    'Respondé unicamente con un JSON valido, sin texto adicional ni markdown, con esta forma exacta:',
    '{ "title": "...", "tmdbMovieId": number, "reason": "..." }',
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
  max_tokens: 200,
});

  const rawContent = completion.choices[0]?.message?.content ?? '';

  return groqRecommendationSchema.parse(JSON.parse(rawContent));
}
