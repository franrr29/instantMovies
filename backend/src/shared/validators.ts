import { z } from 'zod';



// para params de ruta como :id y :tmdbId
export const numericId = z.coerce.number().int().positive();

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
