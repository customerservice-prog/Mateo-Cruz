import { db } from './db.service';

export interface CharacterMemoryEntry {
  videoId: string;
  videoTitle: string;
  summary: string;
  emotionalState: string;
  keyEvents: string[];
  recurringMotifs: string[];
  emotionalOutcome: string;
}

/**
 * Retrieves the last N memories for a character to inject into new video generation.
 * This is what makes Mateo Cruz feel like a continuous character across videos.
 */
export async function getCharacterMemory(
  avatarId: string,
  limit = 5
): Promise<CharacterMemoryEntry[]> {
  const memories = await db.characterMemory.findMany({
    where: { avatarId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return memories.map((m) => ({
    videoId: m.projectId,
    videoTitle: m.summary.split('|')[0]?.trim() || 'Unknown video',
    summary: m.summary,
    emotionalState: m.emotionalState || 'neutral',
    keyEvents: (m.keyEvents as string[]) || [],
    recurringMotifs: [],
    emotionalOutcome: m.emotionalState || 'unresolved',
  }));
}

/**
 * Stores a new memory after a video is completed.
 * Called at the end of the youtube-package job.
 */
export async function storeCharacterMemory(
  avatarId: string,
  projectId: string,
  data: Omit<CharacterMemoryEntry, 'videoId'>
): Promise<void> {
  await db.characterMemory.create({
    data: {
      avatarId,
      projectId,
      summary: `${data.videoTitle} | ${data.summary}`,
      emotionalState: data.emotionalState,
      keyEvents: data.keyEvents,
    },
  });
}

/**
 * Builds a memory context string to inject into concept/script generation.
 * This ensures new videos don't repeat stories and that Mateo "remembers" what happened.
 */
export async function buildMemoryContext(avatarId: string): Promise<string> {
  const memories = await getCharacterMemory(avatarId, 5);

  if (memories.length === 0) {
    return 'This is the first video in the series. Introduce Mateo Cruz and his world.';
  }

  const memoryLines = memories.map(
    (m, i) =>
      `Video ${memories.length - i}: "${m.videoTitle}" — Mateo experienced: ${m.summary}. Emotional outcome: ${m.emotionalOutcome}.`
  );

  return `MATEO CRUZ CHARACTER HISTORY (do not repeat these events):
${memoryLines.join('\n')}

Continue this character's journey. Build on his history. Do not reset his emotional state.
His emotional baseline should reflect his accumulated experiences.`;
}
