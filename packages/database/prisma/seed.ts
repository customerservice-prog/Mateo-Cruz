import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

/**
 * Seeds the database with:
 * 1. A default user (for local development)
 * 2. Mateo Cruz avatar — the locked character identity
 * 
 * Run with: npx prisma db seed
 */
async function main() {
  console.log('Seeding Mateo Cruz database...');

  // Create default dev user
  const user = await db.user.upsert({
    where: { email: 'dev@mateocruZ.local' },
    update: {},
    create: {
      email: 'dev@mateocruZ.local',
      name: 'Studio Owner',
    },
  });

  console.log('User created:', user.id);

  // Create Mateo Cruz — the locked avatar
  // IMPORTANT: This promptBase is the identity that gets injected into EVERY image generation.
  // Never change this without also updating scene.prompt.ts
  const avatar = await db.avatar.upsert({
    where: { id: 'mateo-cruz-v1' },
    update: {
      // Update prompt if we're refining the look
      promptBase: MATEO_PROMPT_BASE,
    },
    create: {
      id: 'mateo-cruz-v1',
      userId: user.id,
      name: 'Mateo Cruz',
      description:
        'The protagonist of "Inside Mateo Cruz" — a heavyset Hispanic man in his early 30s with a deep emotional American voice. Every video is a new chapter in his psychological journey.',
      promptBase: MATEO_PROMPT_BASE,
      negativePrompt: MATEO_NEGATIVE_PROMPT,
      referenceImageUrl: '',  // Add your Mateo Cruz reference image URL here after generating it
      voiceId: process.env.ELEVENLABS_MATEO_VOICE_ID || '',  // Add your ElevenLabs voice ID here
    },
  });

  console.log('Mateo Cruz avatar created/updated:', avatar.id);
  console.log('');
  console.log('NEXT STEPS:');
  console.log('1. Generate a reference image of Mateo Cruz using the promptBase below');
  console.log('2. Upload it to Cloudflare R2 and add the URL to avatar.referenceImageUrl');
  console.log('3. Create an ElevenLabs voice that sounds like Mateo Cruz (deep, American, slightly raspy)');
  console.log('4. Add the voice ID to your .env as ELEVENLABS_MATEO_VOICE_ID');
  console.log('');
  console.log('Avatar prompt base:');
  console.log(MATEO_PROMPT_BASE);
}

const MATEO_PROMPT_BASE = `heavyset Hispanic man, 30-35 years old, short dark hair slightly unkempt, 
tired deep-set eyes with subtle bags underneath, 3-5 days of dark stubble, 
warm tan-brown skin tone, broad nose, strong jawline, 
wearing a dark gray or black hoodie, emotionally heavy body language, 
restrained intense expression — not dramatic but carrying something heavy, 
realistic cinematic portrayal, psychological drama`;

const MATEO_NEGATIVE_PROMPT = `different person, different face, white person, east asian person, 
thin athletic person, woman, child, old man over 50, teenager under 25,
cartoon, anime, illustration, digital painting, 3d render, CGI,
plastic perfect skin, smooth unrealistic skin, watermark, text, logo, 
extra fingers, distorted hands, blurry, low quality, low resolution,
multiple people, crowd, duplicate faces, split screen, collage`;

main()
  .then(() => {
    console.log('Seed complete.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => {
    db.$disconnect();
  });
