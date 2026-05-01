import { db } from '../services/db.service';
import { ai } from '../services/ai.service';

export async function runYouTubePackageJob(projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { avatar: true, scenes: { orderBy: { index: 'asc' } } },
  });

  if (!project) throw new Error('Project not found');

  await db.project.update({
    where: { id: projectId },
    data: { status: 'generating_youtube_package' },
  });

  const totalDuration = project.scenes.reduce((sum: number, s: any) => sum + s.durationSeconds, 0);
  const scriptExcerpt = project.scriptText?.substring(0, 800) || '';

  const youtubeData = await ai.generateJSON({
    system: `You are a YouTube SEO expert specializing in psychological storytelling channels.
Channel: Inside Mateo Cruz — cinematic psychological stories.
Create metadata that is: intriguing, emotionally resonant, monetization-safe.`,
    prompt: `Generate YouTube metadata for this video:
Title concept: ${project.title}
Script opening: ${scriptExcerpt}
Duration: ${Math.round(totalDuration / 60)} minutes

Return JSON:
{
  "title": "compelling YouTube title under 100 chars with mystery/tension hook",
  "description": "3-paragraph YouTube description (400-600 words) with emotional hook, video overview, and channel CTA",
  "tags": ["array", "of", "15-20", "relevant", "tags"],
  "thumbnailPrompt": "detailed image prompt for thumbnail showing Mateo Cruz with strong emotion",
  "chapters": [
    { "timeSeconds": 0, "title": "chapter title" }
  ],
  "pinnedComment": "engaging question or statement to pin as first comment"
}`,
  });

  // Build chapters from scene groups
  const chapterInterval = Math.floor(totalDuration / 6);
  const autoChapters = [];
  let t = 0;
  for (const scene of project.scenes) {
    if (t % chapterInterval === 0 || t === 0) {
      const chapterNum = Math.floor(t / chapterInterval) + 1;
      autoChapters.push({
        timeSeconds: t,
        title: scene.environment || `Part ${chapterNum}`,
      });
    }
    t += scene.durationSeconds;
  }

  const finalChapters = youtubeData.chapters?.length > 3 ? youtubeData.chapters : autoChapters;

  await db.youtubePackage.create({
    data: {
      projectId,
      title: youtubeData.title || project.title || 'Inside Mateo Cruz',
      description: youtubeData.description || '',
      tags: youtubeData.tags || [],
      thumbnailPrompt: youtubeData.thumbnailPrompt || '',
      chapters: finalChapters,
      pinnedComment: youtubeData.pinnedComment || '',
    },
  });

  await db.project.update({
    where: { id: projectId },
    data: { status: 'complete' },
  });

  console.log(`[youtube-package] Project ${projectId} is complete.`);
}
