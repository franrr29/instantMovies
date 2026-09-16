// tests unitarios de auth.schemas: validacion email, password complejo, normalizacion lowercase
import { describe, expect, it } from 'vitest';
import { loginSchema, registerSchema } from '../modules/auth/auth.schemas';

describe('auth.schemas', () => {
  describe('validacion de username', () => {
    it('acepta un email valido', () => {
      const result = registerSchema.safeParse({ username: 'user@test.com', password: 'Demo1234!' });
      expect(result.success).toBe(true);
    });

    it('rechaza un string sin @ con el mensaje correcto', () => {
      const result = registerSchema.safeParse({ username: 'no-es-un-email', password: 'Demo1234!' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('El username debe ser un email válido');
      }
    });

    it('rechaza un string vacio', () => {
      const result = registerSchema.safeParse({ username: '', password: 'Demo1234!' });
      expect(result.success).toBe(false);
    });
  });

  describe('validacion de password (register)', () => {
    it('acepta Demo1234!', () => {
      const result = registerSchema.safeParse({ username: 'user@test.com', password: 'Demo1234!' });
      expect(result.success).toBe(true);
    });

    it('rechaza sin mayuscula', () => {
      const result = registerSchema.safeParse({ username: 'user@test.com', password: 'demo1234!' });
      expect(result.success).toBe(false);
    });

    it('rechaza sin minuscula', () => {
      const result = registerSchema.safeParse({ username: 'user@test.com', password: 'DEMO1234!' });
      expect(result.success).toBe(false);
    });

    it('rechaza sin numero', () => {
      const result = registerSchema.safeParse({ username: 'user@test.com', password: 'Demoabcd!' });
      expect(result.success).toBe(false);
    });

    it('rechaza sin caracter especial', () => {
      const result = registerSchema.safeParse({ username: 'user@test.com', password: 'Demo12345' });
      expect(result.success).toBe(false);
    });

    it('rechaza menos de 8 caracteres', () => {
      const result = registerSchema.safeParse({ username: 'user@test.com', password: 'Dem1!' });
      expect(result.success).toBe(false);
    });

    it('el mensaje de password debil es el esperado', () => {
      const result = registerSchema.safeParse({ username: 'user@test.com', password: 'weak' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial',
        );
      }
    });
  });

  describe('normalizacion de username', () => {
    it('registerSchema transforma el username a lowercase', () => {
      const result = registerSchema.safeParse({ username: 'DEMO@INSTANT.COM', password: 'Demo1234!' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.username).toBe('demo@instant.com');
      }
    });

    it('loginSchema tambien transforma el username a lowercase', () => {
      const result = loginSchema.safeParse({ username: 'DEMO@INSTANT.COM', password: 'cualquier-cosa' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.username).toBe('demo@instant.com');
      }
    });
  });
});
