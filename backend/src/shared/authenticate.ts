import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { HttpError } from './errorHandler';

export interface AuthenticatedUser {
  id: number;
  username: string;
}

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
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    next(unauthorized('token no provisto'));
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    next(new Error('falta configurar la variable de entorno JWT_SECRET'));
    return;
  }

  const token = authHeader.slice('Bearer '.length);

  try {
    const payload = jwt.verify(token, secret) as jwt.JwtPayload;
    req.user = { id: Number(payload.sub), username: payload.username };
    next();
  } catch {
    next(unauthorized('token invalido o expirado'));
  }
}
