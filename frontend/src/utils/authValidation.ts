import { isAxiosError } from 'axios';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// misma regla que backend/src/modules/auth/auth.schemas.ts (PASSWORD_REGEX)
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{}|;:',.<>?/]).{8,}$/;

export const PASSWORD_WEAK_MESSAGE =
  'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial';

export function validateUsername(value: string): string | null {
  if (!value.trim()) return 'El username es obligatorio';
  if (!EMAIL_REGEX.test(value.trim())) return 'El username debe ser un email válido';
  return null;
}

export function validatePasswordRequired(value: string): string | null {
  if (!value) return 'La contraseña es obligatoria';
  return null;
}

export function validatePasswordComplexity(value: string): string | null {
  const requiredError = validatePasswordRequired(value);
  if (requiredError) return requiredError;
  if (!PASSWORD_REGEX.test(value)) return PASSWORD_WEAK_MESSAGE;
  return null;
}

type AuthErrorKind = 'login' | 'register';

function extractFieldErrorMessage(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;

  const details = (data as { details?: { fieldErrors?: Record<string, string[]> } }).details;
  const fieldErrors = details?.fieldErrors;
  if (!fieldErrors) return null;

  const firstMessage = Object.values(fieldErrors).flat()[0];
  return firstMessage ?? null;
}

export function getAuthErrorMessage(error: unknown, kind: AuthErrorKind): string {
  if (isAxiosError(error)) {
    const status = error.response?.status;

    if (status === 401 && kind === 'login') return 'Usuario o contraseña incorrectos';
    if (status === 409 && kind === 'register') return 'Ese usuario ya existe';

    if (status === 400) {
      const fieldMessage = extractFieldErrorMessage(error.response?.data);
      if (fieldMessage) return fieldMessage;

      const genericMessage = (error.response?.data as { error?: string } | undefined)?.error;
      if (genericMessage) return genericMessage;
    }
  }

  return 'Algo salió mal, intentá de nuevo';
}
