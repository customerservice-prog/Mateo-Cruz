'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ProjectRow {
  id: string;
  title: string | null;
  prompt: string;
  status: string;
  targetLengthSeconds: number;
  finalVideoUrl: string | null;
  createdAt: string;
}

export default function ProjectsListPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/projects?userId=demo-user')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setProjects(data.projects || []);
      })
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="border-b border-zinc-800 px-8 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">My Videos</h1>
        <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-white">
          New video
        </Link>
      </div>
      <div className="max-w-3xl mx-auto px-8 py-10">
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        {projects.length === 0 && !error ? (
          <p className="text-zinc-500">No projects yet.</p>
        ) : (
          <ul className="space-y-3">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  className="block bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-600 transition-colors"
                >
                  <div className="font-medium text-white">{p.title || 'Untitled'}</div>
                  <div className="text-xs text-zinc-500 mt-1">{p.status}</div>
                  <div className="text-sm text-zinc-400 mt-2 line-clamp-2">{p.prompt}</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
