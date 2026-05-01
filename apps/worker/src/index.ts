/**
 * Mateo Cruz - Worker Entry Point
 */

import { Worker, Queue } from 'bullmq';
import { runConceptJob } from './jobs/concept.job';
import { runOutlineJob } from './jobs/outline.job';
import { runScriptJob } from './jobs/script.job';
import { runScenesJob } from './jobs/scenes.job';
import { runImagesJob } from './jobs/images.job';
import { runVideosJob } from './jobs/videos.job';
import { runVoiceJob } from './jobs/voice.job';
import { runMusicJob } from './jobs/music.job';
import { runRenderJob } from './jobs/render.job';
import { runQualityJob } from './jobs/quality.job';
import { runYoutubePackageJob } from './jobs/youtube-package.job';

const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
};

export const videoQueue = new Queue('video-generation', { connection });

const worker = new Worker(
    'video-generation',
    async (job) => {
          console.log(`Processing: ${job.name} | project: ${job.data.projectId}`);
          switch (job.name) {
            case 'generate-concept': return runConceptJob(job.data.projectId);
            case 'generate-outline': return runOutlineJob(job.data.projectId);
            case 'generate-script': return runScriptJob(job.data.projectId);
            case 'generate-scenes': return runScenesJob(job.data.projectId);
            case 'generate-images': return runImagesJob(job.data.projectId, job.data.sceneIds);
            case 'generate-videos': return runVideosJob(job.data.projectId, job.data.sceneIds);
            case 'generate-voice': return runVoiceJob(job.data.projectId);
            case 'generate-music': return runMusicJob(job.data.projectId);
            case 'render-final': return runRenderJob(job.data.projectId);
            case 'quality-check': return runQualityJob(job.data.projectId);
            case 'youtube-package': return runYoutubePackageJob(job.data.projectId);
            default: throw new Error(`Unknown job: ${job.name}`);
          }
    },
  { connection, concurrency: 3 }
  );

worker.on('completed', (job) => console.log(`Completed: ${job.name}`));
worker.on('failed', (job, err) => console.error(`Failed: ${job?.name} - ${err.message}`));

console.log('[Worker] Mateo Cruz pipeline started');
