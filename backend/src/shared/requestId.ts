import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { runWithRequestId } from './requestContext';

declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

const REQUEST_ID_HEADER = 'x-request-id';

// si el cliente ya manda un request id lo reusamos (util para tracing entre servicios),
// si no, generamos uno nuevo; se propaga via AsyncLocalStorage para que el logger lo
// incluya automaticamente sin tener que pasarlo a mano por cada capa
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const incomingId = req.headers[REQUEST_ID_HEADER];
  const requestId = typeof incomingId === 'string' && incomingId.length > 0 ? incomingId : randomUUID();

  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);

  runWithRequestId(requestId, next);
}
