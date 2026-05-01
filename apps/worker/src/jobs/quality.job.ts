/**
 * quality.job.ts — Scores video package; never blocks completion (always queues youtube-package).
 */

import type { Prisma } from '@prisma/client';
import { db } from '../services/db.service';
import { videoQueue } from '../queues/video.queue';

const BLOCKED_WORDS = [
  'nigger',
  'faggot',
  'kill yourself',
  'kys ',
  'rape ',
  'child porn',
  'cp ',
  'terrorist attack instructions',
  'bomb how to',
];

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** True if no 5-word phrase appears more than 3 times (case-insensitive). */
function noExcessiveFiveWordRepetition(script: string): boolean {
  const words = script.toLowerCase().replace(/\s+/g, ' ').trim().split(' ');
  if (words.length < 5) return true;
  const counts = new Map<string, number>();
  for (let i = 0; i <= words.length - 5; i++) {
    const phrase = words.slice(i, i + 5).join(' ');
    counts.set(phrase, (counts.get(phrase) || 0) + 1);
    if ((counts.get(phrase) || 0) > 3) return false;
  }
  return true;
}

function advertiserSafe(script: string): boolean {
  const lower = script.toLowerCase();
  return !BLOCKED_WORDS.some((w) => lower.includes(w.toLowerCase()));
}

export async function runQualityJob(projectId: string): Promise<void> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { scenes: true },
  });
  if (!project) throw new Error(`Project not found: ${projectId}`);

  await db.project.update({ where: { id: projectId }, data: { status: 'quality_check' } });

  const script = project.scriptText || '';
  const wc = wordCount(script);
  const environments = new Set(project.scenes.map((s) => s.environment).filter(Boolean));

  const hasVoice = Boolean(project.voiceUrl);
  const sceneCountOk = project.scenes.length >= 60;
  const uniqueEnvironmentsOk = environments.size >= 8;
  const scriptLengthOk = wc >= 1300;
  const noRepetition = noExcessiveFiveWordRepetition(script);
  const safe = advertiserSafe(script);

  let score = 0;
  if (hasVoice) score += 20;
  if (sceneCountOk) score += 20;
  if (uniqueEnvironmentsOk) score += 20;
  if (scriptLengthOk) score += 20;
  if (noRepetition) score += 10;
  if (safe) score += 10;

  const issues: string[] = [];
  if (!hasVoice) issues.push('Missing voice (voiceUrl)');
  if (!sceneCountOk) issues.push(`Scene count low: ${project.scenes.length} (target >= 60)`);
  if (!uniqueEnvironmentsOk) issues.push(`Unique environments: ${environments.size} (target >= 8)`);
  if (!scriptLengthOk) issues.push(`Script length: ${wc} words (target >= 1300)`);
  if (!noRepetition) issues.push('Repeated 5-word phrases (>3 occurrences)');
  if (!safe) issues.push('Advertiser safety: blocked phrase detected');

  const passed = score >= 65;

  if (!passed) {
    console.warn(`[Quality] Score ${score}/100 — issues: ${issues.join('; ')}`);
  } else {
    console.log(`[Quality] Passed: ${score}/100`);
  }

  const issuesJson = issues as unknown as Prisma.InputJsonValue;

  await db.qualityReport.upsert({
    where: { projectId },
    create: {
      projectId,
      score,
      passed,
      issues: issuesJson,
    },
    update: {
      score,
      passed,
      issues: issuesJson,
    },
  });

  await db.project.update({
    where: { id: projectId },
    data: { stepQuality: true, status: passed ? 'quality_passed' : 'quality_flagged' },
  });

  await videoQueue.add('youtube-package', { projectId });
}
