import ElevenLabs from 'elevenlabs';

const elevenlabs = new ElevenLabs({ apiKey: process.env.ELEVENLABS_API_KEY });

/** Mateo Cruz — locked ElevenLabs voice settings */
export const MATEO_VOICE_SETTINGS = {
  stability: 0.72,
  similarity_boost: 0.85,
  style: 0.45,
  use_speaker_boost: true,
} as const;

/**
 * Adds ElevenLabs SSML pauses after sentence endings for slow, emotional delivery.
 */
export function addNarratorPauses(text: string): string {
  return text
    .replace(/\.\.\.+/g, '... ')
    .replace(/([.!?])\s+([A-Z])/g, '$1 <break time="0.8s"/> $2')
    .replace(/([,;])\s+/g, '$1 <break time="0.3s"/> ')
    .replace(/—/g, ' <break time="0.5s"/> ')
    .trim();
}

/**
 * Generate MP3 narration for Mateo Cruz.
 */
export async function generateVoice(text: string, voiceId: string): Promise<Buffer> {
  const processed = addNarratorPauses(text);
  const audioStream = await elevenlabs.generate({
    voice: voiceId,
    text: processed,
    model_id: 'eleven_multilingual_v2',
    voice_settings: { ...MATEO_VOICE_SETTINGS },
    output_format: 'mp3_44100_128',
  });

  const chunks: Buffer[] = [];
  for await (const chunk of audioStream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
