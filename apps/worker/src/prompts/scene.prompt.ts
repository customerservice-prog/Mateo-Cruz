// Mateo Cruz — Avatar Identity (NEVER CHANGE THIS)
export const MATEO_CRUZ_IDENTITY = `MAIN CHARACTER — MATEO CRUZ (MUST MATCH EXACTLY):
- Heavyset Hispanic man, 30-35 years old
- Short dark hair, slightly unkempt
- Tired, deep-set eyes with subtle bags under them
- Light stubble/beard, 3-5 days growth
- Slightly broad nose, warm tan skin tone
- Wearing a dark hoodie or plain dark shirt
- Body language: heavy, grounded, emotionally weighted
- Expression: restrained intensity — not dramatic, but carrying something

STRICT IDENTITY RULES:
- Same face structure in EVERY scene
- Same skin tone — warm tan/Hispanic complexion
- Same hair — short dark, same cut
- Same age — 30-35, no younger, no older
- No other characters unless specifically stated
- Do NOT change ethnicity, age, or face shape`;

export const MATEO_NEGATIVE_PROMPT = `different person, different face, white person, asian person, 
thin person, muscular person, young teenager, old man, woman, 
cartoon, anime, illustration, digital art, painting, 3d render,
plastic skin, smooth skin, perfect skin, watermark, text, logo,
extra fingers, distorted hands, blurry, low quality, low resolution,
multiple people, crowd, duplicate faces, split screen`;

interface BuildScenePromptParams {
  avatar: {
    promptBase: string;
    negativePrompt?: string;
  };
  environment: string;
  emotion: string;
  camera: string;
  lighting: string;
  sceneIndex: number;
  totalScenes: number;
}

export function buildScenePrompt(params: BuildScenePromptParams): string {
  const { environment, emotion, camera, lighting, sceneIndex, totalScenes } = params;

  // Determine story progress for visual intensity
  const progress = sceneIndex / totalScenes;
  const isEarlyScene = progress < 0.2;
  const isClimax = progress > 0.7 && progress < 0.9;
  const isEnding = progress >= 0.9;

  let intensityNote = '';
  if (isEarlyScene) intensityNote = 'calm unease, subtle wrongness, quiet dread';
  else if (isClimax) intensityNote = 'peak tension, raw emotion, overwhelming presence';
  else if (isEnding) intensityNote = 'exhausted, hollow, aftermath of confrontation';
  else intensityNote = 'building tension, escalating dread, controlled panic';

  return `${MATEO_CRUZ_IDENTITY}

SCENE DESCRIPTION:
Environment: ${environment}
Emotional state: ${emotion}
Visual intensity: ${intensityNote}

CINEMATOGRAPHY:
Camera: ${camera}
Lighting: ${lighting}
Style: cinematic psychological drama, realistic, ultra-detailed, 8k quality
Film look: heavy grain, high contrast, desaturated colors with selective warm tones
Shadows: deep blacks, expressive shadow play
Depth of field: shallow, 50mm lens equivalent

ATMOSPHERE:
The scene should feel like a private moment — not staged, not performed.
The environment should feel like it's reacting to his emotional state.
Everything in frame should feel slightly wrong or too quiet.`;
}

export function buildOutlinePrompt(params: {
  concept: any;
  targetLengthSeconds: number;
}): string {
  const minutes = Math.round(params.targetLengthSeconds / 60);
  return `Create a ${minutes}-minute cinematic psychological narrative outline.

Story concept: ${JSON.stringify(params.concept)}

Structure (follow exactly):
- Hook (first 45 seconds): something unsettling, understated, immediately confusing
- Act 1 (next 15%): introduce Mateo's environment, establish dread baseline  
- Act 2 (35%): the phenomenon worsens, logic starts breaking
- Act 3 (30%): direct confrontation with the psychological element
- Act 4 (15%): aftermath — no clean resolution, just changed understanding
- Final moment: ends mid-breath, like the story isn't actually over

Return JSON:
{
  "title": "evocative title, not clickbait, feels like a real event",
  "centralConflict": "one sentence",
  "emotionalArc": "calm → uneasy → anxious → panic → numb → understanding",
  "recurringMotif": "the visual/sound element that repeats throughout",
  "acts": [
    { "name": "act name", "durationSeconds": 0, "summary": "what happens", "emotion": "dominant feeling" }
  ]
}`;
}
