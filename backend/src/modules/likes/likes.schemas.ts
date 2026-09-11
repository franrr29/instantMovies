import { z } from 'zod';

export const addLikeSchema = z.object({
  tmdbMovieId: z.number().int().positive(),
});
