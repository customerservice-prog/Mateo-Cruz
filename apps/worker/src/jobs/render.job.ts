/**
 * render.job.ts - FFmpeg Video Assembly Engine
 * Assembles scenes, voice, music, subtitles into final MP4
 */

import { db } from '../services/db.service';
import { storage } from '../services/storage.service';
import { videoQueue } from '../index';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const TEMP_DIR = process.env.TEMP_DIR || '/tmp/mateocruz';

export async function runRenderJob(projectId: string): Promise<void> {
    const project = await db.project.findUnique({
          where: { id: projectId },
          include: { scenes: { orderBy: { index: 'asc' } } },
    });
    if (!project) throw new Error(`Project not found: ${projectId}`);
    if (project.stepRender) {
          await videoQueue.add('quality-check', { projectId }); return;
    }

  await db.project.update({ where: { id: projectId }, data: { status: 'rendering' } });

  const workDir = path.join(TEMP_DIR, projectId);
    fs.mkdirSync(workDir, { recursive: true });

  try {
        const scenePaths: string[] = [];
        for (const scene of project.scenes) {
                const sceneFile = path.join(workDir, `scene_${String(scene.index).padStart(4,'0')}.mp4`);
                if (scene.videoUrl) {
                          await storage.download(scene.videoUrl, sceneFile);
                } else if (scene.imageUrl) {
                          const imgFile = path.join(workDir, `img_${scene.index}.jpg`);
                          await storage.download(scene.imageUrl, imgFile);
                          kenBurns(imgFile, sceneFile, scene.durationSeconds);
                } else {
                          throw new Error(`Scene ${scene.index} missing media`);
                }
                scenePaths.push(sceneFile);
        }

      const concatFile = path.join(workDir, 'concat.txt');
        fs.writeFileSync(concatFile, scenePaths.map(p => `file '${p}'`).join('\n'));

      const visualsPath = path.join(workDir, 'visuals.mp4');
        execSync(`${FFMPEG} -f concat -safe 0 -i "${concatFile}" -c copy "${visualsPath}"`, { stdio: 'pipe' });

      let cur = visualsPath;

      if (project.voiceUrl) {
              const voiceFile = path.join(workDir, 'voice.mp3');
              await storage.download(project.voiceUrl, voiceFile);
              const out = path.join(workDir, 'with_voice.mp4');
              execSync(`${FFMPEG} -i "${cur}" -i "${voiceFile}" -c:v copy -c:a aac -shortest "${out}"`, { stdio: 'pipe' });
              cur = out;
      }

      if (project.musicUrl) {
              const musicFile = path.join(workDir, 'music.mp3');
              await storage.download(project.musicUrl, musicFile);
              const out = path.join(workDir, 'with_music.mp4');
              execSync(
                        `${FFMPEG} -i "${cur}" -i "${musicFile}" ` +
                        `-filter_complex "[0:a][1:a]amix=inputs=2:duration=first:weights=1 0.15" ` +
                        `-c:v copy -c:a aac "${out}"`,
                { stdio: 'pipe' }
                      );
              cur = out;
      }

      const finalPath = path.join(workDir, 'final.mp4');
        if (project.subtitlesUrl) {
                const srtFile = path.join(workDir, 'subs.srt');
                await storage.download(project.subtitlesUrl, srtFile);
                execSync(
                          `${FFMPEG} -i "${cur}" ` +
                          `-vf "subtitles='${srtFile}':force_style='FontSize=20,PrimaryColour=&HFFFFFF,BorderStyle=3'" ` +
                          `-c:a copy "${finalPath}"`,
                  { stdio: 'pipe' }
                        );
        } else {
                fs.copyFileSync(cur, finalPath);
        }

      const finalUrl = await storage.upload(finalPath, `projects/${projectId}/final.mp4`, 'video/mp4');

      await db.project.update({
              where: { id: projectId },
              data: { finalVideoUrl: finalUrl, stepRender: true, status: 'render_complete' },
      });

      await videoQueue.add('quality-check', { projectId });
        console.log(`[Render] Complete: ${finalUrl}`);
  } finally {
        fs.rmSync(workDir, { recursive: true, force: true });
  }
}

function kenBurns(img: string, out: string, dur: number): void {
    const frames = dur * 30;
    execSync(
          `${FFMPEG} -loop 1 -i "${img}" ` +
          `-vf "scale=1920:1080,zoompan=z='min(zoom+0.0015,1.12)':d=${frames}:s=1920x1080,setsar=1" ` +
          `-t ${dur} -r 30 -c:v libx264 -pix_fmt yuv420p "${out}"`,
      { stdio: 'pipe' }
        );
}
