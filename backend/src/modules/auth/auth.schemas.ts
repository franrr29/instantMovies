import { z } from 'zod';

// username invalido en dos pasos: entra un email valido, sale en lowercase
const usernameSchema = z
  .string()
  .email('El username debe ser un email válido')
  .transform((value) => value.toLowerCase());

// min 8, una mayuscula, una minuscula, un numero, un caracter especial
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:',.<>?/]).{8,}$/;
const PASSWORD_WEAK_MESSAGE =
  'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial';

// reglas de contraseña solo aplican al alta, no tiene sentido exigirlas de nuevo en el login
export const registerSchema = z.object({
  username: usernameSchema,
  password: z.string().regex(PASSWORD_REGEX, PASSWORD_WEAK_MESSAGE),
});

export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1),
});
