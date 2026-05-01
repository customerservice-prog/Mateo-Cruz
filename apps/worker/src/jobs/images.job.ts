import { db } from '../services/db.service';
import { storage } from '../services/storage.service';
import { videoQueue } from '../queues/video.queue';
import Replicate from 'replicate';

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

const CHUNK_SIZE = 20;

async function generateImage(visualPrompt: string, negativePrompt: string, avatarReferenceUrl: string): Promise<string> {
  const output = await replicate.run(
    'black-forest-labs/flux-1.1-pro',
    {
      input: {
        prompt: visualPrompt,
        negative_prompt: negativePrompt,
        width: 1920,
        height: 1080,
        num_inference_steps: 30,
        guidance_scale: 7.5,
      },
    }
  ) as string[];

  return Array.isArray(output) ? output[0] : output;
}

async function processSceneChunk(scenes: any[], avatar: any) {
  for (const scene of scenes) {
    if (scene.imageUrl) continue; // Skip if already generated

    try {
      const imageUrl = await generateImage(
        scene.visualPrompt,
        avatar.negativePrompt || 'different person, different face, cartoon, anime, low quality, blurry, watermark, text, extra fingers, distorted',
        avatar.referenceImageUrl
      );

      const storedUrl = await storage.uploadFromUrl(imageUrl, `scenes/${scene.id}.png`);

      await db.scene.update({
        where: { id: scene.id },
        data: { imageUrl: storedUrl, status: 'image_done' },
      });
    } catch (err) {
      console.error(`Scene ${scene.id} image failed:`, err);
      await db.scene.update({
        where: { id: scene.id },
        data: { status: 'image_failed' },
      });
    }
  }
}

export async function runImagesJob(projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { avatar: true, scenes: { orderBy: { index: 'asc' } } },
  });

  if (!project) throw new Error('Project not found');

  await db.project.update({
    where: { id: projectId },
    data: { status: 'generating_images' },
  });

  // Process in chunks (parallel within each chunk, sequential chunks)
  const chunks: any[][] = [];
  for (let i = 0; i < project.scenes.length; i += CHUNK_SIZE) {
    chunks.push(project.scenes.slice(i, i + CHUNK_SIZE));
  }

  for (const chunk of chunks) {
    await Promise.all(chunk.map(scene => processSceneChunk([scene], project.avatar)));
  }

  const failedCount = project.scenes.filter((s: any) => s.status === 'image_failed').length;
  if (failedCount > project.scenes.length * 0.1) {
    throw new Error(`Too many image failures: ${failedCount}/${project.scenes.length}`);
  }

  await db.project.update({
    where: { id: projectId },
    data: { status: 'images_complete', stepImages: true },
  });

  await videoQueue.add('generate-voice', { projectId });
}
