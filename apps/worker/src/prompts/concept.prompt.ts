import { buildMemoryContext } from '../services/character-memory.service';

export async function buildConceptPrompt(params: {
  userPrompt: string;
  avatarId: string;
  targetLengthSeconds: number;
}): Promise<{ system: string; prompt: string }> {
  const { userPrompt, avatarId, targetLengthSeconds } = params;
  const minutes = Math.round(targetLengthSeconds / 60);

  // Pull Mateo's memory so the new video continues his story
  const memoryContext = await buildMemoryContext(avatarId);

  return {
    system: `You are the creative director of "Inside Mateo Cruz" — an autonomous cinematic YouTube channel.

Your job is to take a raw user idea and transform it into a compelling, original psychological story concept.

CHARACTER: Mateo Cruz
- Heavyset Hispanic man, early 30s, American accent
- Deep, slightly raspy voice — speaks slowly, like confessing something
- Narrator and protagonist of every video
- His stories feel real, personal, and psychologically honest

CHANNEL IDENTITY:
- Every video is a new psychological experience
- Stories feel like real events, not fictional narratives
- No heroes, no villains — just internal psychological conflict
- Endings are never clean. The feeling lingers.
- Style: cinematic confessional. Like if a person sat down and told you something they couldn't stop thinking about.

ORIGINALITY RULES:
- Never reference real celebrities, creators, or public figures
- Never copy existing songs, films, or known stories
- Never reuse story structures from previous Mateo Cruz videos
- Every video must feel like a completely new experience`,

    prompt: `User idea: "${userPrompt}"

${memoryContext}

Create an original ${minutes}-minute cinematic psychological story concept for Mateo Cruz.

The concept must:
1. Be completely original — not derived from any existing work
2. Have a strong psychological hook (something that feels real and unsettling)
3. Feature Mateo Cruz as both narrator and character
4. Have a recurring symbolic motif (sound, object, or image that appears repeatedly)
5. End without full resolution — the audience should sit with the feeling
6. Be YouTube monetization-safe (psychological themes only, no graphic violence, no self-harm instructions)

Return ONLY valid JSON:
{
  "title": "working title for development (not final)",
  "logline": "one sentence: who + what happens + what they discover",
  "hook": "the first 15 seconds of narration — what grabs the viewer immediately",
  "centralConflict": "the internal psychological battle at the core",
  "recurringMotif": "the specific sensory element that recurs symbolically",
  "emotionalArc": "the emotional journey from start to end",
  "monetizationSafe": true,
  "originality": "brief note on what makes this story unique",
  "targetAudience": "who will connect with this"
}`,
  };
}
