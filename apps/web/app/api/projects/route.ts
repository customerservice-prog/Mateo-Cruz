/**
 * /api/projects — Create and list video projects
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const MATEO_AVATAR_ID = 'mateo-cruz-v1';

async function resolveUserId(requestedUserId: string | undefined): Promise<string> {
  if (requestedUserId === 'demo-user' || !requestedUserId) {
    const u = await db.user.findFirst({ where: { email: 'dev@mateocruz.local' } });
    if (!u) throw new Error('No dev user — run: npm run db:seed (or npx prisma db seed from packages/database)');
    return u.id;
  }
  const u = await db.user.findUnique({ where: { id: requestedUserId } });
  if (!u) throw new Error('Invalid userId');
  return u.id;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, avatarId, targetLengthSeconds = 600, userId } = body as {
      prompt?: string;
      avatarId?: string;
      targetLengthSeconds?: number;
      userId?: string;
    };

    if (!prompt || prompt.trim().length < 10) {
      return NextResponse.json({ error: 'Prompt too short' }, { status: 400 });
    }

    const uid = await resolveUserId(userId);
    const aid = avatarId || MATEO_AVATAR_ID;

    const avatar = await db.avatar.findFirst({ where: { id: aid, userId: uid } });
    if (!avatar) {
      return NextResponse.json(
        { error: `Avatar not found for user. Seed DB and use avatar id ${MATEO_AVATAR_ID}.` },
        { status: 400 }
      );
    }

    const project = await db.project.create({
      data: {
        userId: uid,
        avatarId: aid,
        prompt: prompt.trim(),
        targetLengthSeconds,
        status: 'queued',
      },
    });

    const { getVideoQueue } = await import('@/lib/queue');
    await getVideoQueue().add('generate-concept', { projectId: project.id });
    return NextResponse.json({
      projectId: project.id,
      status: 'queued',
      message: 'Video generation started',
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userIdParam = searchParams.get('userId');
    const uid = await resolveUserId(userIdParam || 'demo-user');

    const projects = await db.project.findMany({
      where: { userId: uid },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        prompt: true,
        status: true,
        targetLengthSeconds: true,
        finalVideoUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ projects });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
