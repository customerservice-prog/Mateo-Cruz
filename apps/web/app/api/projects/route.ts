/**
 * /api/projects/route.ts - Create and list video projects
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { videoQueue } from '@/lib/queue';

export async function POST(req: NextRequest) {
    try {
          const { prompt, avatarId, targetLengthSeconds = 600, userId } = await req.json();
          if (!prompt || prompt.trim().length < 10)
                  return NextResponse.json({ error: 'Prompt too short' }, { status: 400 });

      let aid = avatarId;
          if (!aid) {
                  const def = await db.avatar.findFirst({ where: { userId, isDefault: true } });
                  if (!def) return NextResponse.json({ error: 'No avatar found' }, { status: 400 });
                  aid = def.id;
          }

      const project = await db.project.create({
              data: { userId, avatarId: aid, prompt: prompt.trim(), targetLengthSeconds, status: 'queued' },
      });

      await videoQueue.add('generate-concept', { projectId: project.id });
          return NextResponse.json({ projectId: project.id, status: 'queued', message: 'Video generation started' });
    } catch (e: any) {
          return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
          const { searchParams } = new URL(req.url);
          const userId = searchParams.get('userId');
          if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

      const projects = await db.project.findMany({
              where: { userId },
              orderBy: { createdAt: 'desc' },
              select: {
                        id: true, title: true, prompt: true, status: true,
                        targetLengthSeconds: true, finalVideoUrl: true,
                        thumbnailUrl: true, createdAt: true, completedAt: true,
              },
      });

      return NextResponse.json({ projects });
    } catch (e: any) {
          return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
