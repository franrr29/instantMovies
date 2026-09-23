import type { CookieOptions, Response } from 'express';

import { AUTH_COOKIE_MAX_AGE_MS } from './constants';
import { env } from './env';



export const AUTH_COOKIE_NAME = 'token';

// mismas opciones para set y clear (salvo maxAge, que clearCookie no necesita:
// alcanza con que coincidan las demas para que el browser reconozca la cookie)
const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
};



export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    ...baseCookieOptions,
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
  });
}



export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, baseCookieOptions);
}
