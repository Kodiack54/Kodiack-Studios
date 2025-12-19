'use client';

import { useState, useEffect } from 'react';

interface ServerDetailPanelProps {
  tradeline: string;
  displayName: string;
  port: number;
}

interface ServerStats {
  status?: string;
  uptime?: number;
  memory?: number;
  cpu?: number;
  processes?: {
    name: string;
    status: string;
    cpu: number;
    memory: number;
  }[];
  opportunities_found?: number;
  documents_scraped?: number;
  last_run?: string;
  next_run?: string;
  errors_today?: number;
  version?: string;
}

export default function ServerDetailPanel({ tradeline, displayName, port }: ServerDetailPanelProps) {
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch on mount and when tradeline changes
  useEffect(() => {
    fetchStats(true);
  }, [tradeline]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [tradeline]);

  const fetchStats = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tradelines/status/${tradeline}`);
      const data = await res.json();

      if (data.success !== false) {
        // Aggregate stats from processes array
        const processes = data.processes || [];
        const onlineCount = processes.filter((p: any) => p.status === 'online').length;
        const totalMemory = processes.reduce((sum: number, p: any) => sum + (p.memory || 0), 0);
        const avgCpu = processes.length > 0
          ? processes.reduce((sum: number, p: any) => sum + (p.cpu || 0), 0) / processes.length
          : 0;

        // Get uptime from main process (longest running)
        const mainProcess = processes.find((p: any) => p.name?.includes('-main'));
        const uptime = mainProcess?.uptime
          ? Math.floor((Date.now() - mainProcess.uptime) / 1000)
          : undefined;

        // Determine overall status
        let status = 'stopped';
        if (onlineCount === processes.length && processes.length > 0) {
          status = 'online';
        } else if (onlineCount > 0) {
          status = 'partial';
        }

        setStats({
          status,
          uptime,
          memory: totalMemory,
          cpu: avgCpu,
          processes: processes.map((p: any) => ({
            name: p.name,
            status: p.status,
            cpu: p.cpu || 0,
            memory: p.memory || 0,
          })),
        });
      } else {
        setError(data.error || 'Failed to fetch status');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (seconds?: number) => {
    if (!seconds) return '-';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  const formatMemory = (bytes?: number) => {
    if (!bytes) return '-';
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  };

  if (loading) {
    return (
      <div className="p-4 h-full flex flex-col">
        <div className="flex items-start justify-between h-14 flex-shrink-0">
          <div className="flex-1 min-w-0 pr-2">
            <h3 className="text-lg font-semibold text-white leading-tight line-clamp-2">{displayName}</h3>
            <p className="text-xs text-gray-500 truncate">Port {port} | {tradeline}</p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
          Loading stats...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 h-full flex flex-col">
        <div className="flex items-start justify-between h-14 flex-shrink-0 mb-4">
          <div className="flex-1 min-w-0 pr-2">
            <h3 className="text-lg font-semibold text-white leading-tight line-clamp-2">{displayName}</h3>
            <p className="text-xs text-gray-500 truncate">Port {port} | {tradeline}</p>
          </div>
          <button
            onClick={() => fetchStats(true)}
            className="px-3 py-1 text-xs bg-gray-700 text-gray-400 rounded hover:bg-gray-600 hover:text-white transition-colors flex-shrink-0"
          >
            Retry
          </button>
        </div>
        <div className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 h-full flex flex-col">
      {/* Header - Fixed height for 2-line names */}
      <div className="flex items-start justify-between h-14 flex-shrink-0">
        <div className="flex-1 min-w-0 pr-2">
          <h3 className="text-lg font-semibold text-white leading-tight line-clamp-2">{displayName}</h3>
          <p className="text-xs text-gray-500 truncate">Port {port} | {tradeline}</p>
        </div>
        <button
          onClick={() => fetchStats()}
          className="px-3 py-1 text-xs bg-gray-700 text-gray-400 rounded hover:bg-gray-600 hover:text-white transition-colors flex-shrink-0"
        >
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Status"
          value={stats?.status || '-'}
          color={stats?.status === 'online' ? 'green' : stats?.status === 'stopped' ? 'red' : 'gray'}
        />
        <StatCard
          label="Uptime"
          value={formatUptime(stats?.uptime)}
          color="cyan"
        />
        <StatCard
          label="Memory"
          value={formatMemory(stats?.memory)}
          color="blue"
        />
        <StatCard
          label="CPU"
          value={stats?.cpu !== undefined ? `${stats.cpu.toFixed(1)}%` : '-'}
          color={stats?.cpu && stats.cpu > 80 ? 'red' : stats?.cpu && stats.cpu > 50 ? 'yellow' : 'green'}
        />
      </div>

      {/* Process List */}
      {stats?.processes && stats.processes.length > 0 && (
        <div className="bg-gray-800/50 rounded-lg p-3">
          <h4 className="text-xs text-gray-500 uppercase tracking-wide mb-2">Processes</h4>
          <div className="space-y-1.5">
            {stats.processes.map((proc) => (
              <div key={proc.name} className="flex items-center justify-between text-sm">
                <span className="text-gray-300 font-mono text-xs">{proc.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">{proc.cpu.toFixed(1)}% CPU</span>
                  <span className="text-xs text-gray-500">{Math.round(proc.memory / (1024 * 1024))}MB</span>
                  <div className={`w-2 h-2 rounded-full ${proc.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Additional Stats if available */}
      {(stats?.opportunities_found !== undefined || stats?.documents_scraped !== undefined) && (
        <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
          {stats.opportunities_found !== undefined && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Opportunities</span>
              <span className="text-white">{stats.opportunities_found.toLocaleString()}</span>
            </div>
          )}
          {stats.documents_scraped !== undefined && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Documents</span>
              <span className="text-white">{stats.documents_scraped.toLocaleString()}</span>
            </div>
          )}
          {stats.last_run && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Last Run</span>
              <span className="text-white">{new Date(stats.last_run).toLocaleTimeString()}</span>
            </div>
          )}
          {stats.version && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Version</span>
              <span className="text-white font-mono">{stats.version}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'border-blue-500/30 bg-blue-500/10',
    green: 'border-green-500/30 bg-green-500/10',
    red: 'border-red-500/30 bg-red-500/10',
    yellow: 'border-yellow-500/30 bg-yellow-500/10',
    cyan: 'border-cyan-500/30 bg-cyan-500/10',
    gray: 'border-gray-500/30 bg-gray-500/10',
  };

  const textColors: Record<string, string> = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    red: 'text-red-400',
    yellow: 'text-yellow-400',
    cyan: 'text-cyan-400',
    gray: 'text-gray-400',
  };

  return (
    <div className={`border rounded-lg p-3 ${colorClasses[color]}`}>
      <div className={`text-xl font-bold ${textColors[color]}`}>{value}</div>
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
    </div>
  );
}
