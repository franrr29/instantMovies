import { app } from './app';
import { prisma } from './shared/db';
import { env } from './shared/env';
import { logger } from './shared/logger';
import { recommendationQueue, redisConnection } from './queue/recommendationQueue';



const server = app.listen(env.PORT, () => {
  logger.info(`server arrancado en el puerto ${env.PORT}`);
});



async function shutdown(signal: string) {
  logger.info({ signal }, 'señal recibida, iniciando apagado prolijo');

  try {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
    logger.info('servidor http cerrado');

    await recommendationQueue.close();
    logger.info('cola de recomendaciones cerrada');

    await redisConnection.quit();
    logger.info('conexion a redis cerrada');

    await prisma.$disconnect();
    logger.info('conexion a prisma cerrada');

    logger.info('apagado prolijo completo');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'error durante el apagado prolijo');
    process.exit(1);
  }
}



process.on('SIGTERM', () => {
  shutdown('SIGTERM');
});
