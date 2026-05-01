// ============================================================
// Mateo Cruz — Shared Types
// ============================================================

export type ProjectStatus =
  | 'queued'
  | 'generating_concept'
  | 'generating_outline'
  | 'generating_script'
  | 'planning_scenes'
  | 'generating_images'
  | 'generating_voice'
  | 'rendering'
  | 'quality_check'
  | 'quality_passed'
  | 'quality_flagged'
  | 'generating_youtube_package'
  | 'concept_complete'
  | 'script_complete'
  | 'scenes_complete'
  | 'images_complete'
  | 'voice_complete'
  | 'render_complete'
  | 'complete'
  | 'failed';

export type VideoLength = 'auto' | 600 | 1200 | 1800 | 2700 | 3600;

export type EmotionTag =
  | 'calm'
  | 'uneasy'
  | 'anxious'
  | 'panic'
  | 'fear'
  | 'sadness'
  | 'numbness'
  | 'acceptance';

// ============================================================
// Avatar (Character) types
// ============================================================

export interface Avatar {
  id: string;
  userId: string;
  name: string;
  description: string;
  promptBase: string;
  negativePrompt: string;
  referenceImageUrl: string;
  voiceId: string;
  createdAt: string;
}

// Mateo Cruz's locked identity — used in every prompt
export const MATEO_CRUZ: Omit<Avatar, 'id' | 'userId' | 'createdAt'> = {
  name: 'Mateo Cruz',
  description: 'A heavyset Hispanic man in his early 30s with a deep emotional American voice',
  promptBase:
    'heavyset Hispanic man, 30-35 years old, short dark hair slightly unkempt, tired deep-set eyes with subtle bags, 3-5 days dark stubble, warm tan-brown skin, dark hoodie, emotionally heavy body language, restrained intense expression',
  negativePrompt:
    'different person, different face, white person, thin person, woman, child, old man, cartoon, anime, blurry, low quality, watermark, text',
  referenceImageUrl: '',
  voiceId: process.env.ELEVENLABS_MATEO_VOICE_ID || '',
};

// ============================================================
// Project types
// ============================================================

export interface Project {
  id: string;
  userId: string;
  avatarId: string;
  title?: string;
  prompt: string;
  status: ProjectStatus;
  targetLengthSeconds: number;
  finalVideoUrl?: string;
  voiceUrl?: string;
  scriptText?: string;
  createdAt: string;
  avatar?: Avatar;
  scenes?: Scene[];
  youtubePackage?: YoutubePackage;
  qualityReports?: QualityReport[];
}

// ============================================================
// Scene types
// ============================================================

export interface Scene {
  id: string;
  projectId: string;
  index: number;
  durationSeconds: number;
  narration: string;
  emotion?: EmotionTag;
  environment?: string;
  visualPrompt: string;
  motionPrompt?: string;
  imageUrl?: string;
  videoUrl?: string;
  sfxJson?: SceneSFX;
  status: 'pending' | 'image_done' | 'video_done' | 'image_failed' | 'video_failed';
}

export interface SceneSFX {
  ambience: string;
  emotion: string;
  sounds?: string[];
  musicNote?: string;
}

// ============================================================
// Quality Report types
// ============================================================

export interface QualityReport {
  id: string;
  projectId: string;
  score: number;
  passed: boolean;
  issues: QualityIssue[];
  createdAt: string;
}

export interface QualityIssue {
  type: 'warning' | 'error';
  code: string;
  message: string;
}

// ============================================================
// YouTube Package types
// ============================================================

export interface YoutubePackage {
  id: string;
  projectId: string;
  title: string;
  description: string;
  tags: string[];
  thumbnailPrompt: string;
  chapters: YoutubeChapter[];
  pinnedComment: string;
}

export interface YoutubeChapter {
  timeSeconds: number;
  title: string;
}

// ============================================================
// Character Memory types
// ============================================================

export interface CharacterMemory {
  id: string;
  avatarId: string;
  projectId: string;
  summary: string;
  emotionalState: string;
  keyEvents: string[];
  createdAt: string;
}

// ============================================================
// API types
// ============================================================

export interface CreateProjectRequest {
  prompt: string;
  avatarId: string;
  targetLengthSeconds: VideoLength;
}

export interface CreateProjectResponse {
  projectId: string;
  status: ProjectStatus;
}
