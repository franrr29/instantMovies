import type { NextFunction, Request, Response } from 'express';
import { logger } from './logger';

// contrato minimo que cualquier error de negocio debe cumplir para que este
// handler sepa que status devolver, sin conocer los codigos de cada modulo
export interface HttpError extends Error {
  statusCode?: number;
  type?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: HttpError, req: Request, res: Response, next: NextFunction) {
  // body-parser (express.json) tira esto cuando el body no es JSON valido;
  // es un error del cliente, no una falla nuestra, asi que nunca debe caer en 500
  const isJsonParseError = err.type === 'entity.parse.failed';

  const statusCode = isJsonParseError ? 400 : (err.statusCode ?? 500);

  const clientMessage = isJsonParseError
    ? 'el cuerpo de la solicitud no es JSON valido'
    : statusCode === 500
      ? 'error interno del servidor'
      : err.message;

  logger.error({ err, method: req.method, path: req.path }, err.message);

  res.status(statusCode).json({ error: clientMessage });
}
