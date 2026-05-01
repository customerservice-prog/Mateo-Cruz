import { db } from '../services/db.service';
import { ai } from '../services/ai.service';
import { videoQueue } from '../queues/video.queue';
import { buildScenePrompt } from '../prompts/scene.prompt';

const EMOTIONS = ['calm', 'uneasy', 'anxious', 'panic', 'fear', 'sadness', 'numbness', 'acceptance'];
const ENVIRONMENTS = [
  'dark bedroom at night', 'narrow hallway with flickering light', 'empty city street',
  'bathroom mirror scene', 'stairwell shadows', 'abandoned room', 'car interior at night',
  'rooftop at dusk', 'kitchen in the dark', 'empty parking lot', 'foggy exterior',
  'dimly lit living room', 'basement corridor', 'back alley', 'rain-soaked street'
];
const CAMERAS = ['slow push-in', 'static wide shot', 'handheld forward', 'slow pull-back', 'over-shoulder', 'extreme close-up', 'low angle looking up'];
const LIGHTS = ['cold blue ambient', 'single lamp harsh shadow', 'flickering overhead', 'moonlight through window', 'red tinted', 'high contrast silhouette'];

function wordsToSeconds(text: string): number {
  const words = text.split(' ').length;
  const duration = Math.round(words / 2.2); // ~140 wpm slow emotional pace
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

  // Split script into natural scene breaks
  const paragraphs = project.scriptText
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 20);

  const usedEnvs = new Set<string>();
  const usedCameras = new Set<string>();
  const scenes = [];

  for (let i = 0; i < paragraphs.length; i++) {
    const narration = paragraphs[i];
    const duration = wordsToSeconds(narration);
    const emotionIdx = Math.floor((i / paragraphs.length) * EMOTIONS.length);
    const emotion = EMOTIONS[emotionIdx];
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

  // Validate variety
  const uniqueEnvs = new Set(scenes.map(s => s.environment)).size;
  if (uniqueEnvs < Math.min(8, scenes.length / 4)) {
    throw new Error('Not enough environment variety in scenes');
  }

  await db.scene.createMany({ data: scenes });
  await db.project.update({
    where: { id: projectId },
    data: { status: 'scenes_complete', stepScenes: true },
  });

  await videoQueue.add('generate-images', { projectId });
}
