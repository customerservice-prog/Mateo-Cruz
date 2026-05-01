'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface Scene {
  id: string;
  index: number;
  narration: string;
  emotion: string;
  environment: string;
  imageUrl?: string;
  videoUrl?: string;
  status: string;
  durationSeconds: number;
}

interface Project {
  id: string;
  title: string;
  prompt: string;
  status: string;
  finalVideoUrl?: string;
  targetLengthSeconds: number;
  createdAt: string;
  scenes: Scene[];
  youtubePackage?: {
    title: string;
    description: string;
    tags: string[];
    chapters: { timeSeconds: number; title: string }[];
    thumbnailPrompt: string;
  };
}

const STATUS_STEPS = [
  { key: 'queued', label: 'Queued' },
  { key: 'generating_concept', label: 'Writing Concept' },
  { key: 'generating_outline', label: 'Building Outline' },
  { key: 'generating_script', label: 'Writing Script' },
  { key: 'planning_scenes', label: 'Planning Scenes' },
  { key: 'generating_images', label: 'Generating Images' },
  { key: 'generating_voice', label: 'Recording Voiceover' },
  { key: 'rendering', label: 'Rendering Video' },
  { key: 'quality_check', label: 'Quality Check' },
  { key: 'complete', label: 'Complete' },
];

function getStepIndex(status: string): number {
  return STATUS_STEPS.findIndex((s) => s.key === status);
}

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProject = async () => {
      const res = await fetch(`/api/projects/${id}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data);
      }
      setLoading(false);
    };

    fetchProject();

    // Poll every 10 seconds if not complete
    const interval = setInterval(async () => {
      const res = await fetch(`/api/projects/${id}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data);
        if (data.status === 'complete' || data.status === 'failed') {
          clearInterval(interval);
        }
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-red-400">Project not found</div>
      </div>
    );
  }

  const currentStep = getStepIndex(project.status);
  const isComplete = project.status === 'complete';
  const isFailed = project.status === 'failed';

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <a href="/dashboard" className="text-zinc-500 hover:text-white text-sm mb-4 block">
            ← Back to Dashboard
          </a>
          <h1 className="text-3xl font-bold text-white mb-2">
            {project.title || 'Generating title...'}
          </h1>
          <p className="text-zinc-400 text-sm">{project.prompt}</p>
        </div>

        {/* Progress */}
        {!isComplete && !isFailed && (
          <div className="bg-zinc-900 rounded-xl p-6 mb-8 border border-zinc-800">
            <h2 className="text-lg font-semibold mb-4">Pipeline Progress</h2>
            <div className="space-y-3">
              {STATUS_STEPS.map((step, i) => {
                const isDone = i < currentStep;
                const isCurrent = i === currentStep;
                return (
                  <div key={step.key} className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        isDone
                          ? 'bg-green-600 text-white'
                          : isCurrent
                          ? 'bg-blue-600 text-white animate-pulse'
                          : 'bg-zinc-800 text-zinc-600'
                      }`}
                    >
                      {isDone ? '✓' : i + 1}
                    </div>
                    <span
                      className={`text-sm ${isDone ? 'text-green-400' : isCurrent ? 'text-blue-400' : 'text-zinc-600'}`}
                    >
                      {step.label}
                    </span>
                    {isCurrent && (
                      <span className="text-xs text-blue-500 animate-pulse">Processing...</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Failed state */}
        {isFailed && (
          <div className="bg-red-950 border border-red-800 rounded-xl p-6 mb-8">
            <h2 className="text-red-400 font-semibold">Generation Failed</h2>
            <p className="text-red-300 text-sm mt-1">
              Something went wrong during video generation. Check the worker logs.
            </p>
          </div>
        )}

        {/* Complete - Video player */}
        {isComplete && project.finalVideoUrl && (
          <div className="mb-8">
            <div className="bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800">
              <video
                src={project.finalVideoUrl}
                controls
                className="w-full"
                poster=""
              />
            </div>
            <div className="mt-4 flex gap-3">
              <a
                href={project.finalVideoUrl}
                download
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium"
              >
                Download MP4
              </a>
            </div>
          </div>
        )}

        {/* YouTube Package */}
        {isComplete && project.youtubePackage && (
          <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800 mb-8">
            <h2 className="text-lg font-semibold mb-4">YouTube Package</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider">Title</label>
                <p className="text-white mt-1">{project.youtubePackage.title}</p>
              </div>
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider">Description</label>
                <pre className="text-zinc-300 text-sm mt-1 whitespace-pre-wrap font-sans bg-zinc-800 p-3 rounded-lg">
                  {project.youtubePackage.description}
                </pre>
              </div>
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider">Tags</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {project.youtubePackage.tags.map((tag: string) => (
                    <span key={tag} className="bg-zinc-800 text-zinc-300 px-2 py-1 rounded text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider">Chapters</label>
                <div className="mt-1 space-y-1">
                  {project.youtubePackage.chapters.map((ch: any, i: number) => {
                    const mins = Math.floor(ch.timeSeconds / 60);
                    const secs = ch.timeSeconds % 60;
                    return (
                      <div key={i} className="text-zinc-300 text-sm">
                        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')} {ch.title}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scene previews */}
        {project.scenes.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">
              Scenes ({project.scenes.length} total)
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {project.scenes.slice(0, 24).map((scene) => (
                <div key={scene.id} className="bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800">
                  {scene.imageUrl ? (
                    <img
                      src={scene.imageUrl}
                      alt={`Scene ${scene.index + 1}`}
                      className="w-full aspect-video object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-video bg-zinc-800 flex items-center justify-center">
                      <span className="text-zinc-600 text-xs">Generating...</span>
                    </div>
                  )}
                  <div className="p-2">
                    <div className="text-xs text-zinc-500">
                      #{scene.index + 1} · {scene.emotion} · {scene.durationSeconds}s
                    </div>
                    <div className="text-xs text-zinc-400 mt-1 line-clamp-2">{scene.narration}</div>
                  </div>
                </div>
              ))}
            </div>
            {project.scenes.length > 24 && (
              <p className="text-zinc-500 text-sm mt-3">
                +{project.scenes.length - 24} more scenes
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
