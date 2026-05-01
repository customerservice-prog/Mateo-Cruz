export interface ScriptPromptParams {
  outline: any;
  targetWordCount: number;
  characterName: string;
  characterVoiceStyle: string;
}

export function scriptPrompt(params: ScriptPromptParams): { system: string; prompt: string } {
  const { outline, targetWordCount, characterName } = params;

  return {
    system: `You are writing the narration for a long-form cinematic psychological YouTube video.

VOICE IDENTITY — ${characterName}:
- American accent, deep slightly raspy voice
- Speaks slowly, deliberately — like confessing something real
- Never dramatic — intensity comes from restraint, not performance
- Uses short sentences. Pauses. Then continues.
- Speaks in first person, directly to the viewer

WRITING RULES:
1. Strong hook in first 20 seconds — something unsettling, understated
2. No filler. Every sentence must do something: reveal, escalate, or land.
3. Escalate tension every 3-4 paragraphs
4. Use repetition intentionally (e.g., "I told myself it was nothing. I kept telling myself it was nothing.")
5. Unresolved ending — no clean lesson. Just changed understanding.
6. Never mention AI, algorithms, or technology
7. Avoid clichés: "at the end of the day", "in conclusion", "I want to be honest with you"
8. Monetization-safe: psychological themes only, no graphic violence, no self-harm instructions
9. Include natural paragraph breaks for scene transitions (double newline)
10. Target exactly ${targetWordCount} words — no more than 10% over or under`,

    prompt: `Write the complete voiceover script for this video.

Story outline:
${JSON.stringify(outline, null, 2)}

Requirements:
- ${targetWordCount} words total
- First paragraph must hook the viewer in under 15 seconds of narration
- Each paragraph = approximately one visual scene (6-10 seconds of narration)
- Build emotional intensity progressively through the outline acts
- The recurring motif "${outline.recurringMotif}" must appear in at least 5 different paragraphs
- End with something that doesn't resolve — leaves the viewer sitting with the feeling

Begin writing now. No preamble, no explanation. Just the script.`,
  };
}

export function outlinePrompt(params: {
  concept: any;
  targetLengthSeconds: number;
}): { system: string; prompt: string } {
  const minutes = Math.round(params.targetLengthSeconds / 60);

  return {
    system: `You are a psychological narrative director. 
You create story structures for long-form cinematic YouTube videos.
Your stories feel real, grounded, and psychologically accurate.
They are inspired by emotional honesty — not horror movie tropes.`,

    prompt: `Create a ${minutes}-minute psychological story outline based on this concept:
${JSON.stringify(params.concept)}

The story follows Mateo Cruz — a heavyset Hispanic man in his early 30s with a deep American voice.
He speaks like he's telling you something he's been trying to forget.

Return ONLY valid JSON with this structure:
{
  "title": "the video title — evocative, not clickbait, under 80 chars",
  "centralConflict": "one sentence describing the core psychological battle",
  "emotionalArc": "progression of emotional states across the video",
  "recurringMotif": "a specific sensory element that recurs symbolically",
  "acts": [
    {
      "name": "act name",
      "durationSeconds": ${params.targetLengthSeconds * 0.15},
      "summary": "what happens in this act",
      "emotion": "dominant emotional state"
    }
  ]
}`,
  };
}
