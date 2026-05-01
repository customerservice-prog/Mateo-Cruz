import { db } from '../services/db.service';
import { storage } from '../services/storage.service';
import { videoQueue } from '../queues/video.queue';
import ElevenLabs from 'elevenlabs';

const elevenlabs = new ElevenLabs({ apiKey: process.env.ELEVENLABS_API_KEY });

// Mateo Cruz voice settings - locked forever
const MATEO_VOICE_SETTINGS = {
  stability: 0.72,
  similarity_boost: 0.85,
  style: 0.45,        // Slight emotional style
  use_speaker_boost: true,
};

// Add natural pacing pauses to narration text
function addNarratorPauses(text: string): string {
  return text
    .replace(/\.\.\.+/g, '... ')            // Respect existing ellipses
    .replace(/([.!?])\s+([A-Z])/g, '$1 <break time="0.8s"/> $2')  // Pause after sentences
    .replace(/([,;])\s+/g, '$1 <break time="0.3s"/> ')             // Short pause at commas
    .replace(/—/g, ' <break time="0.5s"/> ')                         // Em-dash pauses
    .trim();
}

// Generate SRT subtitle content from scenes
function generateSRT(scenes: any[]): string {
  let srt = '';
  let timeOffset = 0;

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const startMs = timeOffset * 1000;
    const endMs = (timeOffset + scene.durationSeconds) * 1000;

    const toSRTTime = (ms: number) => {
      const h = Math.floor(ms / 3600000).toString().padStart(2, '0');
      const m = Math.floor((ms % 3600000) / 60000).toString().padStart(2, '0');
      const s = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
      const milli = (ms % 1000).toString().padStart(3, '0');
      return `${h}:${m}:${s},${milli}`;
    };

    // Split narration into subtitle lines (~8 words per line)
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

  const processedScript = addNarratorPauses(project.scriptText);

  // Generate voiceover with ElevenLabs
  const audioStream = await elevenlabs.generate({
    voice: project.avatar.voiceId,
    text: processedScript,
    model_id: 'eleven_multilingual_v2',
    voice_settings: MATEO_VOICE_SETTINGS,
    output_format: 'mp3_44100_128',
  });

  // Collect stream to buffer
  const chunks: Buffer[] = [];
  for await (const chunk of audioStream) {
    chunks.push(Buffer.from(chunk));
  }
  const audioBuffer = Buffer.concat(chunks);

  const voiceUrl = await storage.uploadBuffer(audioBuffer, `projects/${projectId}/voice.mp3`, 'audio/mpeg');

  // Generate SRT subtitles
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
