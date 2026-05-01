/**
 * render.job.ts — Full FFmpeg pipeline: Ken Burns clips → concat → voice + subs + music → R2
 */

import * as fs from 'fs';
import * as path from 'path';
import { db } from '../services/db.service';
import { storage } from '../services/storage.service';
import { ffmpeg } from '../services/ffmpeg.service';
import { videoQueue } from '../queues/video.queue';

const TMP_DIR = process.env.TMP_DIR || '/tmp/mateo-cruz';

type MotionStyle = 'zoom-in' | 'zoom-out' | 'pan-right' | 'pan-left';

const MOTIONS: MotionStyle[] = ['zoom-in', 'zoom-out', 'pan-right', 'pan-left'];

function pickMotion(prev: MotionStyle | null): MotionStyle {
  const pool = prev ? MOTIONS.filter((m) => m !== prev) : MOTIONS;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

export async function runRenderJob(projectId: string): Promise<void> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { scenes: { orderBy: { index: 'asc' } } },
  });
  if (!project) throw new Error(`Project not found: ${projectId}`);

  if (project.stepRender) {
    await videoQueue.add('quality-check', { projectId });
    return;
  }

  await db.project.update({ where: { id: projectId }, data: { status: 'rendering' } });

  const workDir = path.join(TMP_DIR, `mateo-${projectId}`);
  const scenesDir = path.join(workDir, 'scenes');
  fs.mkdirSync(scenesDir, { recursive: true });

  try {
    const clipPaths: string[] = [];
    let lastMotion: MotionStyle | null = null;

    for (const scene of project.scenes) {
      if (!scene.imageUrl) {
        throw new Error(`Scene ${scene.index} missing imageUrl`);
      }

      const ext = scene.imageUrl.split('?')[0]?.toLowerCase().endsWith('.png') ? 'png' : 'jpg';
      const imgPath = path.join(scenesDir, `scene_${String(scene.index).padStart(4, '0')}.${ext}`);
      await storage.download(scene.imageUrl, imgPath);

      const motion = pickMotion(lastMotion);
      lastMotion = motion;

      const clipPath = path.join(workDir, `clip_${String(scene.index).padStart(4, '0')}.mp4`);
      await ffmpeg.kenBurnsFromImage(imgPath, clipPath, scene.durationSeconds, motion);
      clipPaths.push(clipPath);
    }

    const visualsPath = path.join(workDir, 'visuals.mp4');
    await ffmpeg.concatVideos(clipPaths, visualsPath);

    if (!project.voiceUrl) {
      throw new Error('Missing voiceUrl for final mix');
    }

    const voicePath = path.join(workDir, 'voice.mp3');
    await storage.download(project.voiceUrl, voicePath);

    let subtitlesPath = path.join(workDir, 'subs.srt');
    if (project.subtitlesUrl) {
      await storage.download(project.subtitlesUrl, subtitlesPath);
    } else {
      fs.writeFileSync(subtitlesPath, '1\n00:00:00,000 --> 00:00:02,000\n\n', 'utf8');
    }

    let musicPath: string | undefined;
    if (project.musicUrl) {
      musicPath = path.join(workDir, 'music.mp3');
      await storage.download(project.musicUrl, musicPath);
    }

    const mixedPath = path.join(workDir, 'mixed.mp4');
    await ffmpeg.mixFinalVideo({
      videoPath: visualsPath,
      voicePath,
      subtitlesPath,
      outputPath: mixedPath,
      musicPath,
    });

    const finishedPath = path.join(workDir, 'final.mp4');
    await ffmpeg.addCinematicFinish(mixedPath, finishedPath);

    const finalUrl = await storage.uploadFile(finishedPath, `projects/${projectId}/final.mp4`, 'video/mp4');

    await db.project.update({
      where: { id: projectId },
      data: { finalVideoUrl: finalUrl, stepRender: true, status: 'render_complete' },
    });

    await videoQueue.add('quality-check', { projectId });
    console.log(`[Render] Complete: ${finalUrl}`);
  } finally {
    await ffmpeg.cleanup(projectId);
  }
}
