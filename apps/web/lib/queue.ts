import { Queue } from 'bullmq';
import Redis from 'ioredis';

let queue: Queue | undefined;

/**
 * Lazy BullMQ queue so `next build` never opens a Redis socket (Railway build has no Redis).
 */
export function getVideoQueue(): Queue {
  if (queue) return queue;

  const connection = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });

  queue = new Queue('video-generation', {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    },
  });

  return queue;
}
