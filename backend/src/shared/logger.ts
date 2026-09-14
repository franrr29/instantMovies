import pino from 'pino';
import { getRequestId } from './requestContext';

//observabilidad: logger centralizado para la aplicación y tener logs consistentes en toda la app
export const logger = pino({
  serializers: {
    err: pino.stdSerializers.err,
  },
  // agrega requestId a cada log emitido durante el ciclo de vida de un request,
  // sin tener que pasarlo manualmente en cada logger.info/error de cada capa
  mixin() {
    const requestId = getRequestId();
    return requestId ? { requestId } : {};
  },
});
