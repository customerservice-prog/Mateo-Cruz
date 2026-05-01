/**
 * concept.job.ts
 * Step 1: Generate the video concept from user prompt
 */

import { db } from '../services/db.service';
import { ai } from '../services/ai.service';
import { videoQueue } from '../index';

const CONCEPT_PROMPT = (prompt: string, length: number) => `
You are creating an original long-form cinematic YouTube story.

User idea: "${prompt}"
Target length: ${Math.round(length / 60)} minutes

Create a UNIQUE psychological story concept with these rules:
- Original characters, NO real celebrities or existing IP
- Emotionally raw and cinematic (like a short psychological film)
- Built around internal conflict made visible
- Must feel like a personal confession, not a performance
- Dark, introspective, and symbolically rich
- Suitable for YouTube monetization

Return JSON:
{
  "title": "compelling YouTube title with tension",
    "centralConflict": "one sentence",
      "emotionalTheme": "e.g. isolation, guilt, anxiety",
        "symbol": "the recurring visual symbol (e.g. door, mirror, shadow)",
          "symbolMeaning": "what it represents psychologically",
            "mainCharacter": {
                "name": "Mateo Cruz",
                    "emotionalState": "starting state",
                        "arc": "where he ends emotionally"
                          },
                            "hook": "first 10 seconds description - must be unsettling or confusing",
                              "endingType": "unresolved | partial | pyrrhic",
                                "tone": "dark cinematic | psychological horror | emotional drama",
                                  "niche": "psychological storytelling"
                                  }
                                  `;

export async function runConceptJob(projectId: string): Promise<void> {
    console.log(`[Concept Job] Starting for project: ${projectId}`);

  const project = await db.project.findUnique({
        where: { id: projectId },
        include: { avatar: true },
  });

  if (!project) throw new Error(`Project not found: ${projectId}`);
    if (project.stepConcept) {
          console.log(`[Concept Job] Already completed, skipping`);
          await videoQueue.add('generate-outline', { projectId });
          return;
    }

  await db.project.update({
        where: { id: projectId },
        data: { status: 'generating_concept' },
  });

  const conceptRaw = await ai.generateJSON(
        CONCEPT_PROMPT(project.prompt, project.targetLengthSeconds)
      );

  // Validate output
  if (!conceptRaw.title || !conceptRaw.centralConflict) {
        throw new Error('AI returned invalid concept structure');
  }

  await db.project.update({
        where: { id: projectId },
        data: {
                title: conceptRaw.title,
                conceptJson: conceptRaw,
                stepConcept: true,
                status: 'concept_complete',
        },
  });

  console.log(`[Concept Job] Complete. Title: ${conceptRaw.title}`);

  // Queue next step
  await videoQueue.add('generate-outline', { projectId });
}
