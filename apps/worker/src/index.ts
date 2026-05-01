/**
 * Mateo Cruz — Worker entry point
 */

import { Worker } from 'bullmq';
import { connection, videoQueue } from './queues/video.queue';
import { db } from './services/db.service';
import { runConceptJob } from './jobs/concept.job';
import { runScriptJob } from './jobs/script.job';
import { runScenesJob } from './jobs/scenes.job';
import { runImagesJob } from './jobs/images.job';
import { runVoiceJob } from './jobs/voice.job';
import { runRenderJob } from './jobs/render.job';
import { runQualityJob } from './jobs/quality.job';
import { runYouTubePackageJob } from './jobs/youtube-package.job';

export { videoQueue };

const worker = new Worker(
  'video-generation',
  async (job) => {
    console.log(`Processing: ${job.name} | project: ${job.data.projectId}`);
    const { projectId } = job.data as { projectId: string };

    switch (job.name) {
      case 'generate-concept':
        return runConceptJob(projectId);
      case 'generate-script':
        return runScriptJob(projectId);
      case 'generate-scenes':
        return runScenesJob(projectId);
      case 'generate-images':
        return runImagesJob(projectId);
      case 'generate-voice':
        return runVoiceJob(projectId);
      case 'render-final':
        return runRenderJob(projectId);
      case 'quality-check':
        return runQualityJob(projectId);
        case 'youtube-package':
        return runYouTubePackageJob(projectId);
      default:
        throw new Error(`Unknown job: ${job.name}`);
    }
  },
  { connection, concurrency: 3 }
);

worker.on('completed', (job) => console.log(`Completed: ${job.name}`));

worker.on('failed', async (job, err) => {
  console.error(`Failed: ${job?.name} — ${err.message}`);
  const projectId = (job?.data as { projectId?: string } | undefined)?.projectId;
  if (!projectId) return;
  try {
    await db.project.update({
      where: { id: projectId },
      data: { status: 'failed' },
    });
  } catch (e) {
    console.error('[Worker] Could not mark project failed:', e);
  }
});

console.log('[Worker] Mateo Cruz pipeline started');
