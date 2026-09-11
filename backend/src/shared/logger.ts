import pino from 'pino';

//observabilidad: logger centralizado para la aplicación y tener logs consistentes en toda la app
export const logger = pino({
  serializers: {
    err: pino.stdSerializers.err,
  },
});
