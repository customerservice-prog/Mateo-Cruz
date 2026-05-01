/**
 * quality.job.ts - Monetization Quality Gate
 */

import { db } from '../services/db.service';
import { ai } from '../services/ai.service';
import { videoQueue } from '../index';

export async function runQualityJob(projectId: string): Promise<void> {
    const project = await db.project.findUnique({
          where: { id: projectId },
          include: { scenes: true },
    });
    if (!project) throw new Error(`Project not found: ${projectId}`);

  await db.project.update({ where: { id: projectId }, data: { status: 'quality_check' } });

  const script = project.scriptText || '';
    const wordCount = script.split(/\s+/).length;
    const repetition = ai.repetitionScore(script);
    const environments = new Set(project.scenes.map((s: any) => s.environment).filter(Boolean));

  const checks = {
        hasVoice: Boolean(project.voiceUrl),
        hasFinalVideo: Boolean(project.finalVideoUrl),
        sceneCount: project.scenes.length,
        sceneCountPass: project.scenes.length >= 60,
        uniqueEnvironments: environments.size,
        sceneVarietyPass: environments.size >= 6,
        repetitionScore: repetition,
        repetitionPass: repetition <= 0.35,
        scriptLength: wordCount,
        scriptLengthPass: wordCount >= 1200,
        advertisingFriendly: ai.isSafe(script),
        aiDisclosureNeeded: true,
  };

  let score = 0;
    if (checks.hasVoice) score += 20;
    if (checks.hasFinalVideo) score += 15;
    if (checks.sceneCountPass) score += 15;
    if (checks.sceneVarietyPass) score += 15;
    if (checks.repetitionPass) score += 15;
    if (checks.scriptLengthPass) score += 10;
    if (checks.advertisingFriendly) score += 10;

  const issues: string[] = [];
    if (!checks.hasVoice) issues.push('Missing voiceover');
    if (!checks.hasFinalVideo) issues.push('Missing final video');
    if (!checks.sceneCountPass) issues.push(`Too few scenes: ${checks.sceneCount}`);
    if (!checks.sceneVarietyPass) issues.push(`Too few environments: ${checks.uniqueEnvironments}`);
    if (!checks.repetitionPass) issues.push(`Script too repetitive: ${(checks.repetitionScore * 100).toFixed(1)}%`);
    if (!checks.scriptLengthPass) issues.push(`Script too short: ${checks.scriptLength} words`);
    if (!checks.advertisingFriendly) issues.push('Non-advertiser-friendly content detected');

  const passed = score >= 65 && issues.length === 0;

  await db.qualityReport.create({
        data: { projectId, score, passed, issues, checks: checks as any },
  });

  if (!passed) {
        await db.project.update({
                where: { id: projectId },
                data: { status: 'quality_failed', errorMessage: issues.join(', ') },
        });
        throw new Error(`Quality gate failed (${score}/100): ${issues.join(', ')}`);
  }

  await db.project.update({ where: { id: projectId }, data: { status: 'quality_passed' } });
    console.log(`[Quality] Passed: ${score}/100`);
    await videoQueue.add('youtube-package', { projectId });
}
