import { Queue, QueueEvents } from 'bullmq';
import Redis from 'ioredis';

export const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
});

export const videoQueue = new Queue('video-generation', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

export const queueEvents = new QueueEvents('video-generation', { connection });

export const JOB_NAMES = {
  GENERATE_CONCEPT: 'generate-concept',
  GENERATE_SCRIPT: 'generate-script',
  GENERATE_SCENES: 'generate-scenes',
  GENERATE_IMAGES: 'generate-images',
  GENERATE_VOICE: 'generate-voice',
  RENDER_FINAL: 'render-final',
  QUALITY_CHECK: 'quality-check',
  YOUTUBE_PACKAGE: 'youtube-package',
} as const;

export type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES];

export async function queueJob(name: JobName, projectId: string, delay?: number) {
  return videoQueue.add(name, { projectId }, { delay });
}

export async function getQueueStats() {
  const [waiting, active, completed, failed] = await Promise.all([
    videoQueue.getWaitingCount(),
    videoQueue.getActiveCount(),
    videoQueue.getCompletedCount(),
    videoQueue.getFailedCount(),
  ]);
  return { waiting, active, completed, failed };
}

export { connection as redisConnection };
