'use client';

import { RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { usePipelineStatus } from './hooks/usePipelineStatus';
import type { PipelineHealth } from './types';

interface SessionHubPageProps {
  teamBasePort?: number;
  isGlobal?: boolean;
}

// Helper to get team name from base port
function getTeamName(basePort?: number): string {
  if (!basePort) return 'Global Team';
  const teamNumber = Math.floor((basePort - 5400) / 10);
  if (teamNumber === 0) return 'Global Team';
  return `Development Team ${teamNumber}`;
}

export default function SessionHubPage({ teamBasePort, isGlobal = false }: SessionHubPageProps) {
  const chadPort = teamBasePort ? teamBasePort + 1 : undefined;
  const teamName = getTeamName(teamBasePort);

  const {
    chadStatus,
    jenStatus,
    susanStatus,
    buckets,
    previousBuckets,
    sessions,
    health,
    totalPending,
    loading,
    refreshAll,
  } = usePipelineStatus({ chadPort, isGlobal });

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between shrink-0 relative">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">Session Hub</h1>
          <HealthBadge health={health.overall} />
        </div>
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <span className="text-lg font-bold text-cyan-400">{teamName}</span>
        </div>
        <button
          onClick={refreshAll}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white text-sm rounded transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* 3-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* CHAD - Session Logs */}
        <div className="flex-1 flex flex-col border-r border-gray-700 min-w-0">
          <ColumnHeader
            name="Chad"
            role="Capture"
            health={health.chad}
            metric={chadStatus.sessionsCapured}
            metricLabel="captured"
            color="blue"
            error={chadStatus.error}
          />
          <div className="flex-1 overflow-auto p-3 space-y-2">
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-2xl mb-2">📭</div>
                <p className="text-sm">No sessions yet</p>
                <p className="text-xs mt-1">Dumps every 10 min</p>
              </div>
            ) : (
              sessions.map(session => (
                <SessionLogItem key={session.id} session={session} />
              ))
            )}
          </div>
        </div>

        {/* JEN - Flagged Buckets */}
        <div className="flex-1 flex flex-col border-r border-gray-700 min-w-0">
          <ColumnHeader
            name="Jen"
            role="Scrub & Flag"
            health={health.jen}
            metric={jenStatus.itemsFlagged}
            metricLabel="flagged"
            color="purple"
            error={jenStatus.error}
          />
          <div className="flex-1 overflow-auto p-3">
            {Object.keys(buckets).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-2xl mb-2">🏷️</div>
                <p className="text-sm">No items flagged yet</p>
              </div>
            ) : (
              <div className="space-y-1">
                {Object.entries(buckets)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, count]) => (
                    <BucketRow
                      key={name}
                      name={name}
                      count={count}
                      prev={previousBuckets[name] ?? 0}
                    />
                  ))}
                <div className="pt-2 mt-2 border-t border-gray-700">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Total Pending</span>
                    <span className="font-bold text-yellow-400">{totalPending}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SUSAN - Sorted Items */}
        <div className="flex-1 flex flex-col min-w-0">
          <ColumnHeader
            name="Susan"
            role="Categorize & File"
            health={health.susan}
            metric={susanStatus.itemsCategorized}
            metricLabel="filed"
            color="green"
            error={susanStatus.error}
          />
          <div className="flex-1 overflow-auto p-3">
            {susanStatus.itemsCategorized === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-2xl mb-2">📁</div>
                <p className="text-sm">No items filed yet</p>
                <p className="text-xs mt-1">Waiting for Jen</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Show recently filed items by project */}
                <SortedProjectList sessions={sessions} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Column header with team member info
interface ColumnHeaderProps {
  name: string;
  role: string;
  health: 'healthy' | 'stuck' | 'error' | 'idle';
  metric: number;
  metricLabel: string;
  color: 'blue' | 'purple' | 'green';
  error?: string | null;
}

function ColumnHeader({ name, role, health, metric, metricLabel, color, error }: ColumnHeaderProps) {
  const colors = {
    blue: 'bg-blue-900/50 border-blue-600',
    purple: 'bg-purple-900/50 border-purple-600',
    green: 'bg-green-900/50 border-green-600',
  };
  const textColors = {
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    green: 'text-green-400',
  };
  const healthDots = {
    healthy: 'bg-green-400',
    stuck: 'bg-yellow-400 animate-pulse',
    error: 'bg-red-400',
    idle: 'bg-gray-500',
  };

  return (
    <div className={`p-3 border-b ${colors[color]} shrink-0`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${healthDots[health]}`} />
          <span className={`font-semibold ${textColors[color]}`}>{name}</span>
        </div>
        <span className="text-xs text-gray-500">{role}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-white">{metric}</span>
        <span className="text-xs text-gray-500">{metricLabel}</span>
      </div>
      {error && (
        <div className="mt-1 text-[10px] text-red-400 truncate">{error}</div>
      )}
    </div>
  );
}

// Session log item for Chad's column
function SessionLogItem({ session }: { session: any }) {
  const time = session.started_at ? formatTime(session.started_at) : '??:??';
  const endTime = session.ended_at ? formatTime(session.ended_at) : 'now';
  const user = session.user_name || session.user_id || 'Unknown';
  const source = session.source_name || session.source_type || 'Terminal';

  // Status indicator
  const isDone = session.categorized_by_susan;
  const isWithJen = session.scrubbed_by_jen && !isDone;
  const isWithSusan = session.captured_by_chad && !session.scrubbed_by_jen;

  return (
    <div className={`p-2 rounded border text-sm ${
      isDone ? 'border-green-800/50 bg-green-900/10 opacity-50' :
      isWithJen ? 'border-purple-800/50 bg-purple-900/20' :
      isWithSusan ? 'border-yellow-800/50 bg-yellow-900/20' :
      'border-blue-800/50 bg-blue-900/20'
    }`}>
      <div className="flex items-center justify-between">
        <span className="font-medium text-white truncate">{user}</span>
        <span className="text-[10px] text-gray-500 font-mono shrink-0 ml-2">
          {time} - {endTime}
        </span>
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-gray-500 truncate">{source}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
          isDone ? 'bg-green-900/50 text-green-400' :
          isWithJen ? 'bg-purple-900/50 text-purple-400' :
          isWithSusan ? 'bg-yellow-900/50 text-yellow-400' :
          'bg-blue-900/50 text-blue-400'
        }`}>
          {isDone ? '✓ Done' : isWithJen ? '→ Jen' : isWithSusan ? '→ Susan' : 'Captured'}
        </span>
      </div>
    </div>
  );
}

// Bucket row for Jen's column
function BucketRow({ name, count, prev }: { name: string; count: number; prev: number }) {
  const delta = count - prev;

  return (
    <div className={`flex items-center justify-between py-1.5 px-2 rounded ${
      count > 0 ? 'bg-purple-900/20' : 'bg-gray-800/30'
    }`}>
      <span className={`text-sm truncate ${count > 0 ? 'text-white' : 'text-gray-500'}`}>
        {name}
      </span>
      <div className="flex items-center gap-2 shrink-0 ml-2">
        {delta !== 0 && (
          <span className={`text-[10px] font-mono ${delta > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {delta > 0 ? '+' : ''}{delta}
          </span>
        )}
        <span className={`font-mono font-bold min-w-[24px] text-right ${
          count > 0 ? 'text-purple-400' : 'text-gray-600'
        }`}>
          {count}
        </span>
      </div>
    </div>
  );
}

// Susan's sorted items by project
function SortedProjectList({ sessions }: { sessions: any[] }) {
  // Group completed sessions by project
  const byProject: Record<string, { count: number; recent: string[] }> = {};

  sessions
    .filter(s => s.categorized_by_susan)
    .forEach(s => {
      const project = s.project_path || s.source_name || 'Unknown Project';
      const shortProject = project.split('/').pop() || project;
      if (!byProject[shortProject]) {
        byProject[shortProject] = { count: 0, recent: [] };
      }
      byProject[shortProject].count++;
      if (byProject[shortProject].recent.length < 3) {
        byProject[shortProject].recent.push(s.user_name || s.user_id || 'Unknown');
      }
    });

  const projects = Object.entries(byProject).sort((a, b) => b[1].count - a[1].count);

  if (projects.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 text-sm">
        No items filed to projects yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {projects.map(([project, data]) => (
        <div key={project} className="p-2 rounded bg-green-900/20 border border-green-800/50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white truncate">{project}</span>
            <span className="text-green-400 font-mono font-bold">{data.count}</span>
          </div>
          <div className="text-[10px] text-gray-500 mt-1 truncate">
            {data.recent.join(', ')}
          </div>
        </div>
      ))}
    </div>
  );
}

// Health badge
function HealthBadge({ health }: { health: PipelineHealth['overall'] }) {
  const config = {
    healthy: { bg: 'bg-green-600/20', text: 'text-green-400', icon: CheckCircle, label: 'Healthy' },
    degraded: { bg: 'bg-yellow-600/20', text: 'text-yellow-400', icon: AlertTriangle, label: 'Degraded' },
    down: { bg: 'bg-red-600/20', text: 'text-red-400', icon: XCircle, label: 'Down' },
  };
  const c = config[health];
  const Icon = c.icon;

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${c.bg}`}>
      <Icon className={`w-3.5 h-3.5 ${c.text}`} />
      <span className={`text-xs font-medium ${c.text}`}>{c.label}</span>
    </div>
  );
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}
