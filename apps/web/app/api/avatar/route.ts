import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const MATEO_AVATAR_ID = 'mateo-cruz-v1';

export async function GET() {
  try {
    const avatar = await db.avatar.findUnique({
      where: { id: MATEO_AVATAR_ID },
    });
    if (!avatar) {
      return NextResponse.json({ error: 'Mateo Cruz avatar not found. Run prisma db seed.' }, { status: 404 });
    }
    return NextResponse.json(avatar);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const existing = await db.avatar.findUnique({ where: { id: MATEO_AVATAR_ID } });
    if (!existing) {
      return NextResponse.json({ error: 'Mateo Cruz avatar not found. Run prisma db seed.' }, { status: 404 });
    }

    const body = await req.json();
    const { referenceImageUrl, voiceId } = body as {
      referenceImageUrl?: string;
      voiceId?: string;
    };

    const data: { referenceImageUrl?: string; voiceId?: string } = {};
    if (typeof referenceImageUrl === 'string') data.referenceImageUrl = referenceImageUrl;
    if (typeof voiceId === 'string') data.voiceId = voiceId;

    const avatar = await db.avatar.update({
      where: { id: MATEO_AVATAR_ID },
      data,
    });
    return NextResponse.json(avatar);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
