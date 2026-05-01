/**
 * ai.service.ts
 * Unified AI service for script, scene, and prompt generation
 * Supports OpenAI GPT-4o and Anthropic Claude as fallback
 */

import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const ai = {
    /**
         * Generate text content
     */
    async generate(prompt: string, systemPrompt?: string): Promise<string> {
          const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            {
                      role: 'system',
                      content: systemPrompt || 'You are a cinematic storytelling AI that creates original psychological narratives for YouTube.',
            },
            { role: 'user', content: prompt },
                ];

      const response = await openai.chat.completions.create({
              model: process.env.OPENAI_MODEL || 'gpt-4o',
              messages,
              max_tokens: 8000,
              temperature: 0.85,
      });

                    return response.choices[0]?.message?.content || '';
    },

    /**
         * Generate and parse JSON output
     */
    async generateJSON<T = Record<string, unknown>>(prompt: string): Promise<T> {
          const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            {
                      role: 'system',
                      content:
                                  'You are a cinematic storytelling AI. Always respond with valid JSON only. No markdown, no explanation.',
            },
            { role: 'user', content: prompt },
                ];

      const response = await openai.chat.completions.create({
              model: process.env.OPENAI_MODEL || 'gpt-4o',
              messages,
              response_format: { type: 'json_object' },
              max_tokens: 8000,
              temperature: 0.85,
      });

      const raw = response.choices[0]?.message?.content || '{}';
          return JSON.parse(raw) as T;
    },

    /**
         * Build a scene visual prompt with avatar identity locked
     */
    buildScenePrompt(scene: {
          environment: string;
          emotion: string;
          visualPrompt: string;
          motionPrompt?: string;
          cameraType?: string;
          lightingStyle?: string;
    }): string {
          const AVATAR_BASE =
                  'heavyset Hispanic man, approximately 32 years old, short dark hair, tired eyes with subtle bags, ' +
                  'slight dark stubble beard, wearing a dark hoodie, pale olive skin tone, emotionally heavy expression, ' +
                  'slightly heavy build, introspective look';

      return [
              `MAIN CHARACTER: ${AVATAR_BASE}`,
              `SCENE ENVIRONMENT: ${scene.environment}`,
              `EMOTIONAL STATE: ${scene.emotion}`,
              `VISUAL DIRECTION: ${scene.visualPrompt}`,
              `LIGHTING: ${scene.lightingStyle || 'cold blue, high contrast shadows'}`,
              `CAMERA: ${scene.cameraType || 'medium shot'} - ${scene.motionPrompt || 'slow push-in'}`,
              'STYLE: realistic cinematic psychological drama, film grain, shallow depth of field, expressive shadows',
              'STRICT IDENTITY RULES: same face, same age, same hair, same skin tone, same body type - never change the character',
            ].join('\n');
    },

    /**
         * Calculate scene duration from word count
     * 1 word = ~0.45 seconds of speech
     */
    calcSceneDuration(narration: string): number {
          const words = narration.trim().split(/\s+/).length;
          const raw = words * 0.45;
          return Math.max(5, Math.min(12, Math.round(raw)));
    },

    /**
         * Check for repetition in text (0-1 score, higher = more repetitive)
     */
    repetitionScore(text: string): number {
          const words = text.toLowerCase().split(/\s+/);
          const unique = new Set(words);
          return 1 - unique.size / words.length;
    },

    /**
         * Check if text contains disqualifying content
     */
    isSafe(text: string): boolean {
          const banned = [
                  'as an ai', 'as an language model', 'celebrity name', 'real person',
                  'suicide method', 'self harm instructions', 'violence instructions',
                ];
          const lower = text.toLowerCase();
          return !banned.some((b) => lower.includes(b));
    },
};
