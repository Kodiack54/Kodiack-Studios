'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Project {
  id: string;
  name: string;
  description: string;
  port: number;
  color: string;
  href: string;
}

interface ProjectsOverviewProps {
  projects: Project[];
}

export default function ProjectsOverview({ projects }: ProjectsOverviewProps) {
  const [statusData, setStatusData] = useState<Record<string, {
    status: 'online' | 'offline' | 'degraded' | 'loading';
    uptime?: string;
    lastCheck?: string;
  }>>({});

  useEffect(() => {
    // Initialize
    const initial: Record<string, any> = {};
    projects.forEach((p) => {
      initial[p.id] = { status: 'loading' };
    });
    setStatusData(initial);

    // Check each project
    projects.forEach(async (project) => {
      try {
        const res = await fetch(`/api/${project.id}/health`);
        const data = await res.json();
        setStatusData((prev) => ({
          ...prev,
          [project.id]: {
            status: data.status === 'healthy' || data.status === 'online' ? 'online' : 'degraded',
            uptime: data.uptime,
            lastCheck: new Date().toISOString(),
          },
        }));
      } catch {
        setStatusData((prev) => ({
          ...prev,
          [project.id]: {
            status: 'offline',
            lastCheck: new Date().toISOString(),
          },
        }));
      }
    });
  }, [projects]);

  const colorClasses: Record<string, string> = {
    blue: 'hover:border-blue-500/50 hover:bg-blue-500/5',
    green: 'hover:border-green-500/50 hover:bg-green-500/5',
    purple: 'hover:border-purple-500/50 hover:bg-purple-500/5',
    yellow: 'hover:border-yellow-500/50 hover:bg-yellow-500/5',
    pink: 'hover:border-pink-500/50 hover:bg-pink-500/5',
    orange: 'hover:border-orange-500/50 hover:bg-orange-500/5',
  };

  const statusColors: Record<string, string> = {
    online: 'bg-green-500',
    offline: 'bg-red-500',
    degraded: 'bg-yellow-500',
    loading: 'bg-gray-500 animate-pulse',
  };

  const statusTextColors: Record<string, string> = {
    online: 'text-green-400',
    offline: 'text-red-400',
    degraded: 'text-yellow-400',
    loading: 'text-gray-400',
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project) => {
        const projectStatus = statusData[project.id] || { status: 'loading' };

        return (
          <Link
            key={project.id}
            href={project.href}
            className={`bg-gray-800 border border-gray-700 rounded-xl p-5 transition-all ${colorClasses[project.color]}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${statusColors[projectStatus.status]}`} />
                <span className="font-semibold text-white">{project.name}</span>
              </div>
              <span className="text-xs text-gray-500">:{project.port}</span>
            </div>

            <p className="text-xs text-gray-400 mb-3 line-clamp-2">
              {project.description}
            </p>

            <div className="flex items-center justify-between">
              <span className={`text-xs ${statusTextColors[projectStatus.status]}`}>
                {projectStatus.status === 'loading' ? 'Checking...' : projectStatus.status}
              </span>
              {projectStatus.uptime && (
                <span className="text-xs text-gray-600">
                  {projectStatus.uptime}
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
