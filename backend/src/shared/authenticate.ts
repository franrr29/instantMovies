import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { AUTH_COOKIE_NAME } from './authCookie';
import { env } from './env';
import type { HttpError } from './errorHandler';



export interface AuthenticatedUser {
  id: number;
  username: string;
}

// agrega req.user al tipo Request de express
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}



function unauthorized(message: string): HttpError {
  const error: HttpError = new Error(message);
  error.statusCode = 401;
  return error;
}



export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[AUTH_COOKIE_NAME];

  if (!token) {
    next(unauthorized('token no provisto'));
    return;
  }

  try {
    // sub es el id de usuario y username un claim extra, ambos definidos al firmar en auth.service
    const payload = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
    req.user = { id: Number(payload.sub), username: payload.username };
    next();
  } catch {
    next(unauthorized('token invalido o expirado'));
  }
}
