import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../shared/env';

// se comparte con el worker; maxRetriesPerRequest: null es requerido por BullMQ
// para las conexiones que usa un Worker (comandos bloqueantes)
export const redisConnection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const recommendationQueue = new Queue('recommendations', {
  connection: redisConnection,
});
