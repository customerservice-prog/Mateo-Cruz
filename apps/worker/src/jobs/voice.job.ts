import { db } from '../services/db.service';
import { storage } from '../services/storage.service';
import { videoQueue } from '../queues/video.queue';
import { generateVoice } from '../services/voice.service';

function generateSRT(scenes: { durationSeconds: number; narration: string }[]): string {
  let srt = '';
  let timeOffset = 0;

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const startMs = timeOffset * 1000;
    const endMs = (timeOffset + scene.durationSeconds) * 1000;

    const toSRTTime = (ms: number) => {
      const h = Math.floor(ms / 3600000)
        .toString()
        .padStart(2, '0');
      const m = Math.floor((ms % 3600000) / 60000)
        .toString()
        .padStart(2, '0');
      const s = Math.floor((ms % 60000) / 1000)
        .toString()
        .padStart(2, '0');
      const milli = (ms % 1000).toString().padStart(3, '0');
      return `${h}:${m}:${s},${milli}`;
    };

    const words = scene.narration.split(' ');
    const lines: string[] = [];
    for (let j = 0; j < words.length; j += 8) {
      lines.push(words.slice(j, j + 8).join(' '));
    }

    srt += `${i + 1}\n${toSRTTime(startMs)} --> ${toSRTTime(endMs)}\n${lines.join('\n')}\n\n`;
    timeOffset += scene.durationSeconds;
  }

  return srt;
}

export async function runVoiceJob(projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { avatar: true, scenes: { orderBy: { index: 'asc' } } },
  });

  if (!project?.scriptText) throw new Error('No script text found');
  if (!project.avatar.voiceId) throw new Error('No voice ID set for avatar');

  await db.project.update({
    where: { id: projectId },
    data: { status: 'generating_voice' },
  });

  const audioBuffer = await generateVoice(project.scriptText, project.avatar.voiceId);

  const voiceUrl = await storage.uploadBuffer(audioBuffer, `projects/${projectId}/voice.mp3`, 'audio/mpeg');

  const srtContent = generateSRT(project.scenes);
  const subtitleUrl = await storage.uploadBuffer(
    Buffer.from(srtContent, 'utf8'),
    `projects/${projectId}/subtitles.srt`,
    'text/plain'
  );

  await db.project.update({
    where: { id: projectId },
    data: {
      voiceUrl,
      subtitlesUrl: subtitleUrl,
      status: 'voice_complete',
      stepVoice: true,
    },
  });

  await videoQueue.add('render-final', { projectId });
}
