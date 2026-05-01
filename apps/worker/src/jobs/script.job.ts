import { db } from '../services/db.service';
import { ai } from '../services/ai.service';
import { videoQueue } from '../queues/video.queue';

export async function runScriptJob(projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { avatar: true },
  });

  if (!project) throw new Error('Project not found');

  await db.project.update({
    where: { id: projectId },
    data: { status: 'generating_outline' },
  });

  const targetMinutes = project.targetLengthSeconds / 60;
  const targetWordCount = Math.round(targetMinutes * 140);

  const outline = await ai.generateJSON({
    system: 'You are a cinematic story director. Create a psychological narrative outline.',
    prompt: `Create a ${Math.round(targetMinutes)}-minute outline. User idea: ${project.prompt}
Character: ${project.avatar.name} - heavyset Hispanic man, early 30s, American accent, deep emotional voice.
Return JSON: { title, acts: [{name, durationSeconds, summary}], emotionalArc, centralConflict, recurringMotif }`,
  });

  await db.project.update({
    where: { id: projectId },
    data: { outlineJson: outline, status: 'generating_script' },
  });

  const script = await ai.generateText({
    system: `Write long-form psychological narration for cinematic YouTube.
Voice: calm, confessional, like telling someone something real.
Rules: strong hook in first 20s, escalate tension, unresolved ending.`,
    prompt: `Write a complete ${targetWordCount}-word voiceover script.
Outline: ${JSON.stringify(outline)}
Narrator: ${project.avatar.name}. First person. Begin with something unsettling but understated.`,
  });

  if (script.split(' ').length < targetWordCount * 0.65) {
    throw new Error('Script too short');
  }

  await db.project.update({
    where: { id: projectId },
    data: { scriptText: script, status: 'script_complete', stepScript: true },
  });

  await videoQueue.add('generate-scenes', { projectId });
}
