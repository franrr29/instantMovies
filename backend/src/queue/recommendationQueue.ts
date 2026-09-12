import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

// se comparte con el worker; maxRetriesPerRequest: null es requerido por BullMQ
// para las conexiones que usa un Worker (comandos bloqueantes)
export const redisConnection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const recommendationQueue = new Queue('recommendations', {
  connection: redisConnection,
});
