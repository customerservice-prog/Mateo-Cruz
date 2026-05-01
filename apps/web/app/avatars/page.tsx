'use client';

import { useEffect, useState } from 'react';

interface Avatar {
  id: string;
  name: string;
  description: string;
  promptBase: string;
  referenceImageUrl: string;
  voiceId: string;
}

export default function AvatarsPage() {
  const [avatar, setAvatar] = useState<Avatar | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    referenceImageUrl: '',
    voiceId: '',
  });

  useEffect(() => {
    fetch('/api/avatar')
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setAvatar(data);
          setForm({
            referenceImageUrl: data.referenceImageUrl || '',
            voiceId: data.voiceId || '',
          });
        }
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await fetch('/api/avatar', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-10">
          <a href="/dashboard" className="text-zinc-500 hover:text-white text-sm mb-4 block">
            ← Back to Dashboard
          </a>
          <h1 className="text-3xl font-bold text-white mb-2">Character Setup</h1>
          <p className="text-zinc-400">Configure Mateo Cruz — your locked avatar identity</p>
        </div>

        {/* Avatar Identity Card */}
        <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800 mb-6">
          <div className="flex items-start gap-6">
            {form.referenceImageUrl ? (
              <img
                src={form.referenceImageUrl}
                alt="Mateo Cruz"
                className="w-32 h-32 rounded-xl object-cover border border-zinc-700"
              />
            ) : (
              <div className="w-32 h-32 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                <span className="text-zinc-600 text-xs text-center px-2">No reference image</span>
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white">Mateo Cruz</h2>
              <p className="text-zinc-400 text-sm mt-1">
                Heavyset Hispanic man, early 30s, American accent, deep emotional voice
              </p>
              <div className="mt-3 flex gap-2 flex-wrap">
                {['Cinematic', 'Psychological', 'Confessional', 'Consistent'].map((tag) => (
                  <span key={tag} className="bg-zinc-800 text-zinc-400 px-2 py-1 rounded text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Character Prompt */}
        <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800 mb-6">
          <h3 className="font-semibold text-white mb-3">Visual Identity Prompt</h3>
          <p className="text-xs text-zinc-500 mb-3">
            This prompt is injected into EVERY image generation to keep Mateo consistent across all videos.
            Do not change this unless you are intentionally redesigning the character.
          </p>
          <pre className="bg-zinc-800 p-4 rounded-lg text-zinc-300 text-xs whitespace-pre-wrap font-mono">
            {avatar?.promptBase || 'Loading...'}
          </pre>
        </div>

        {/* Configuration */}
        <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800 mb-6">
          <h3 className="font-semibold text-white mb-4">Configuration</h3>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Reference Image URL
              </label>
              <p className="text-xs text-zinc-500 mb-2">
                Generate a Mateo Cruz image using Flux/Midjourney with the prompt above, upload to R2, and paste the URL here.
              </p>
              <input
                type="url"
                value={form.referenceImageUrl}
                onChange={(e) => setForm({ ...form, referenceImageUrl: e.target.value })}
                placeholder="https://your-r2-bucket.r2.dev/mateo-reference.png"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                ElevenLabs Voice ID
              </label>
              <p className="text-xs text-zinc-500 mb-2">
                Create a deep, slightly raspy American male voice in ElevenLabs Voice Lab. Paste the voice ID here.
                This voice will be used for every video Mateo narrates.
              </p>
              <input
                type="text"
                value={form.voiceId}
                onChange={(e) => setForm({ ...form, voiceId: e.target.value })}
                placeholder="ElevenLabs voice ID (e.g. 21m00Tcm4TlvDq8ikWAM)"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Setup Guide */}
        <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800/50 mb-8">
          <h3 className="font-semibold text-white mb-3">Setup Guide</h3>
          <ol className="space-y-3 text-sm text-zinc-400">
            <li className="flex gap-3">
              <span className="text-blue-400 font-bold shrink-0">1.</span>
              <span>Generate a Mateo Cruz image using Midjourney, Flux, or SDXL with the visual identity prompt above.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-400 font-bold shrink-0">2.</span>
              <span>Upload the image to your Cloudflare R2 bucket and paste the public URL in "Reference Image URL".</span>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-400 font-bold shrink-0">3.</span>
              <span>Go to ElevenLabs Voice Lab → create a new voice. Settings: stability 72%, clarity 85%, style 45%. Choose a deep, slightly raspy American male voice or clone one.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-400 font-bold shrink-0">4.</span>
              <span>Copy the voice ID from ElevenLabs and paste it above.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-400 font-bold shrink-0">5.</span>
              <span>Save changes. Your first video will use this reference image to generate all scene images with a consistent Mateo Cruz face.</span>
            </li>
          </ol>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white py-3 rounded-xl font-semibold text-sm transition-colors"
        >
          {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Character Configuration'}
        </button>
      </div>
    </div>
  );
}
