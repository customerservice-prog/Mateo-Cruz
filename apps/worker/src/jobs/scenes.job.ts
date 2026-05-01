import { db } from '../services/db.service';
import { videoQueue } from '../queues/video.queue';
import { buildScenePrompt } from '../prompts/scene.prompt';

const EMOTIONS = ['calm', 'uneasy', 'anxious', 'panic', 'fear', 'sadness', 'numbness', 'acceptance'];
const ENVIRONMENTS = [
  'dark bedroom at night',
  'narrow hallway with flickering light',
  'empty city street',
  'bathroom mirror scene',
  'stairwell shadows',
  'abandoned room',
  'car interior at night',
  'rooftop at dusk',
  'kitchen in the dark',
  'empty parking lot',
  'foggy exterior',
  'dimly lit living room',
  'basement corridor',
  'back alley',
  'rain-soaked street',
];
const CAMERAS = [
  'slow push-in',
  'static wide shot',
  'handheld forward',
  'slow pull-back',
  'over-shoulder',
  'extreme close-up',
  'low angle looking up',
];
const LIGHTS = [
  'cold blue ambient',
  'single lamp harsh shadow',
  'flickering overhead',
  'moonlight through window',
  'red tinted',
  'high contrast silhouette',
];

function wordsToSeconds(text: string): number {
  const words = text.split(' ').length;
  const duration = Math.round(words / 2.2);
  return Math.max(5, Math.min(10, duration));
}

function pickVaried<T>(arr: T[], index: number, usedSet: Set<T>): T {
  let pick = arr[index % arr.length];
  if (usedSet.has(pick)) {
    pick = arr[(index + 3) % arr.length];
  }
  usedSet.add(pick);
  return pick;
}

/**
 * Split script into enough narration chunks for long-form (>= ~60 scenes for quality scoring).
 */
function chunkScriptForScenes(scriptText: string, minScenes = 60): string[] {
  const normalized = scriptText.replace(/\r\n/g, '\n').trim();
  const words = normalized.split(/\s+/).filter(Boolean);
  const totalWords = words.length;
  if (totalWords === 0) return [];

  const desired = Math.max(minScenes, Math.min(220, Math.ceil(totalWords / 22)));
  const sentences = normalized
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (sentences.length >= desired) {
    const perChunk = Math.ceil(sentences.length / desired);
    const chunks: string[] = [];
    for (let i = 0; i < sentences.length; i += perChunk) {
      const piece = sentences.slice(i, i + perChunk).join(' ');
      if (piece.length > 20) chunks.push(piece);
    }
    return chunks;
  }

  const wordsPerScene = Math.max(18, Math.ceil(totalWords / desired));
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += wordsPerScene) {
    const piece = words.slice(i, i + wordsPerScene).join(' ');
    if (piece.length > 15) chunks.push(piece);
  }
  return chunks;
}

export async function runScenesJob(projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { avatar: true },
  });

  if (!project?.scriptText) throw new Error('No script found');

  await db.project.update({
    where: { id: projectId },
    data: { status: 'planning_scenes' },
  });

  const paragraphs = chunkScriptForScenes(project.scriptText, 60);
  if (paragraphs.length === 0) throw new Error('Could not split script into scenes');

  const usedEnvs = new Set<string>();
  const usedCameras = new Set<string>();
  const scenes = [];

  for (let i = 0; i < paragraphs.length; i++) {
    const narration = paragraphs[i];
    const duration = wordsToSeconds(narration);
    const emotionIdx = Math.floor((i / paragraphs.length) * EMOTIONS.length);
    const emotion = EMOTIONS[Math.min(emotionIdx, EMOTIONS.length - 1)];
    const environment = pickVaried(ENVIRONMENTS, i, usedEnvs);
    const camera = pickVaried(CAMERAS, i, usedCameras);
    const lighting = LIGHTS[i % LIGHTS.length];

    const visualPrompt = buildScenePrompt({
      avatar: project.avatar,
      environment,
      emotion,
      camera,
      lighting,
      sceneIndex: i,
      totalScenes: paragraphs.length,
    });

    scenes.push({
      projectId,
      index: i,
      durationSeconds: duration,
      narration,
      emotion,
      environment,
      visualPrompt,
      motionPrompt: `${camera}, ${lighting}, subtle breathing and micro head movements, no identity drift`,
      sfxJson: { ambience: environment, emotion },
      status: 'pending',
    });
  }

  const uniqueEnvs = new Set(scenes.map((s) => s.environment)).size;
  if (uniqueEnvs < 8 && scenes.length >= 8) {
    throw new Error('Not enough environment variety in scenes');
  }

  await db.scene.createMany({ data: scenes });
  await db.project.update({
    where: { id: projectId },
    data: { status: 'scenes_complete', stepScenes: true },
  });

  await videoQueue.add('generate-images', { projectId });
}
