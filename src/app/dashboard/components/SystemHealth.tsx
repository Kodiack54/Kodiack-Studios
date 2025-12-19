'use client';

import { useEffect, useState } from 'react';

interface Project {
  id: string;
  name: string;
  port: number;
  workerPort: number | null;
}

interface SystemHealthProps {
  projects: Project[];
}

type HealthStatus = 'online' | 'offline' | 'degraded' | 'loading';

interface ServiceHealth {
  server: HealthStatus;
  worker: HealthStatus | null; // null if no worker
}

export default function SystemHealth({ projects }: SystemHealthProps) {
  const [healthData, setHealthData] = useState<Record<string, ServiceHealth>>({});

  useEffect(() => {
    // Initialize all as loading
    const initial: Record<string, ServiceHealth> = {};
    projects.forEach((p) => {
      initial[p.id] = {
        server: 'loading',
        worker: p.workerPort ? 'loading' : null,
      };
    });
    setHealthData(initial);

    // Check health for each project's server
    projects.forEach(async (project) => {
      try {
        const res = await fetch(`/api/${project.id}/health`);
        const data = await res.json();
        setHealthData((prev) => ({
          ...prev,
          [project.id]: {
            ...prev[project.id],
            server: data.status === 'healthy' || data.status === 'online' ? 'online' : 'degraded',
          },
        }));
      } catch {
        setHealthData((prev) => ({
          ...prev,
          [project.id]: {
            ...prev[project.id],
            server: 'offline',
          },
        }));
      }

      // Check worker health if it has one
      if (project.workerPort) {
        try {
          const res = await fetch(`/api/${project.id}/worker/health`);
          const data = await res.json();
          setHealthData((prev) => ({
            ...prev,
            [project.id]: {
              ...prev[project.id],
              worker: data.status === 'healthy' || data.status === 'online' ? 'online' : 'degraded',
            },
          }));
        } catch {
          setHealthData((prev) => ({
            ...prev,
            [project.id]: {
              ...prev[project.id],
              worker: 'offline',
            },
          }));
        }
      }
    });
  }, [projects]);

  const statusColors: Record<string, string> = {
    online: 'bg-green-500',
    offline: 'bg-red-500',
    degraded: 'bg-yellow-500',
    loading: 'bg-gray-500 animate-pulse',
  };

  // Count servers
  const serverStatuses = Object.values(healthData).map((h) => h.server);
  const serverOnline = serverStatuses.filter((s) => s === 'online').length;
  const serverOffline = serverStatuses.filter((s) => s === 'offline').length;
  const serverDegraded = serverStatuses.filter((s) => s === 'degraded').length;

  // Count workers (only those that have workers)
  const workerStatuses = Object.values(healthData).map((h) => h.worker).filter((w) => w !== null);
  const workerOnline = workerStatuses.filter((s) => s === 'online').length;
  const workerOffline = workerStatuses.filter((s) => s === 'offline').length;
  const workerDegraded = workerStatuses.filter((s) => s === 'degraded').length;

  // Total counts
  const totalOnline = serverOnline + workerOnline;
  const totalOffline = serverOffline + workerOffline;
  const totalDegraded = serverDegraded + workerDegraded;
  const totalSystems = projects.length + workerStatuses.length;

  return (
    <div className="space-y-4 mb-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Systems */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">Total Services</div>
          <div className="text-2xl font-bold text-white">{totalSystems}</div>
          <div className="text-xs text-gray-500 mt-1">{projects.length} servers + {workerStatuses.length} workers</div>
        </div>

        {/* Online */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">Online</div>
          <div className="text-2xl font-bold text-green-400">{totalOnline}</div>
          <div className="text-xs text-gray-500 mt-1">Running healthy</div>
        </div>

        {/* Degraded */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">Degraded</div>
          <div className={`text-2xl font-bold ${totalDegraded > 0 ? 'text-yellow-400' : 'text-gray-400'}`}>
            {totalDegraded}
          </div>
          <div className="text-xs text-gray-500 mt-1">Needs attention</div>
        </div>

        {/* Offline */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">Offline</div>
          <div className={`text-2xl font-bold ${totalOffline > 0 ? 'text-red-400' : 'text-gray-400'}`}>
            {totalOffline}
          </div>
          <div className="text-xs text-gray-500 mt-1">Not responding</div>
        </div>
      </div>

      {/* Detailed Status Grid */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <div className="text-xs text-gray-500 mb-3">Service Status</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {projects.map((p) => {
            const health = healthData[p.id];
            return (
              <div key={p.id} className="bg-gray-900 rounded-lg p-3">
                <div className="text-sm font-medium text-white mb-2">{p.name}</div>
                <div className="space-y-1">
                  {/* Server Status */}
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${statusColors[health?.server || 'loading']}`}
                      title={`Server: ${health?.server || 'checking...'}`}
                    />
                    <span className="text-xs text-gray-400">:{p.port}</span>
                  </div>
                  {/* Worker Status (if exists) */}
                  {p.workerPort && (
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${statusColors[health?.worker || 'loading']}`}
                        title={`Worker: ${health?.worker || 'checking...'}`}
                      />
                      <span className="text-xs text-gray-500">:{p.workerPort} <span className="text-gray-600">worker</span></span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
