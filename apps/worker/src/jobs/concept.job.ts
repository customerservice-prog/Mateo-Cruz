/**
 * concept.job.ts
 * Step 1: Generate the video concept from user prompt (with character memory)
 */

import type { Prisma } from '@prisma/client';
import { db } from '../services/db.service';
import { ai } from '../services/ai.service';
import { videoQueue } from '../queues/video.queue';
import { buildConceptPrompt } from '../prompts/concept.prompt';

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function runConceptJob(projectId: string): Promise<void> {
  console.log(`[Concept Job] Starting for project: ${projectId}`);

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { avatar: true },
  });

  if (!project) throw new Error(`Project not found: ${projectId}`);

  if (project.stepConcept) {
    console.log(`[Concept Job] Already completed, skipping`);
    await videoQueue.add('generate-script', { projectId });
    return;
  }

  await db.project.update({
    where: { id: projectId },
    data: { status: 'generating_concept' },
  });

  const targetLen =
    project.targetLengthSeconds > 0 ? project.targetLengthSeconds : 1200;

  const { system, prompt } = await buildConceptPrompt({
    userPrompt: project.prompt,
    avatarId: project.avatarId,
    targetLengthSeconds: targetLen,
  });

  const conceptRaw = await ai.generateJSON<Record<string, unknown>>({ system, prompt });

  if (!conceptRaw.title || !(conceptRaw.centralConflict || conceptRaw.logline)) {
    throw new Error('AI returned invalid concept structure');
  }

  await db.project.update({
    where: { id: projectId },
    data: {
      title: String(conceptRaw.title),
      conceptJson: toInputJson(conceptRaw),
      stepConcept: true,
      status: 'concept_complete',
    },
  });

  console.log(`[Concept Job] Complete. Title: ${conceptRaw.title}`);
  await videoQueue.add('generate-script', { projectId });
}
