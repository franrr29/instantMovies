import { Queue } from 'bullmq';
import IORedis from 'ioredis';

import { env } from '../shared/env';



export const RECOMMENDATIONS_QUEUE_NAME = 'recommendations';

// se comparte con el worker; maxRetriesPerRequest: null es requerido por BullMQ
// para las conexiones que usa un Worker (comandos bloqueantes)
export const redisConnection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const recommendationQueue = new Queue(RECOMMENDATIONS_QUEUE_NAME, {
  connection: redisConnection,
});
