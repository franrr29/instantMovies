import { z } from 'zod';

// reglas de contraseña solo aplican al alta, no tiene sentido exigirlas de nuevo en el login
export const registerSchema = z.object({
  username: z.string().min(3).max(30),
  password: z.string().min(8),
});

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});
