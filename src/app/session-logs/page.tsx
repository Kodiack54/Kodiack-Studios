'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

// ALL data comes from DATABASE - no HTTP calls to workers
// Workers write TO database, dashboard reads FROM database

interface Session {
  id: string;
  user_name?: string;
  user_id?: string;
  started_at?: string;
  ended_at?: string;
  terminal_port?: number;
  status?: string;
  source_name?: string;
  project_path?: string;
}

interface BucketCounts {
  [key: string]: number;
}

interface DatabaseStats {
  total_sessions: number;
  active: number;
  captured: number;
  scrubbed: number;
  flagged: number;
  pending: number;
  cleaned: number;
  archived: number;
  last_24h: number;
  last_session: string | null;
}

export default function SessionLogsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [buckets, setBuckets] = useState<BucketCounts>({});
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch all data from database
  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [sessionsRes, bucketsRes] = await Promise.all([
        fetch('/api/ai-sessions?limit=100', { cache: 'no-store' }),
        fetch('/api/ai-sessions/buckets', { cache: 'no-store' }),
      ]);

      if (!sessionsRes.ok || !bucketsRes.ok) {
        throw new Error('Failed to fetch from database');
      }

      const sessionsData = await sessionsRes.json();
      const bucketsData = await bucketsRes.json();

      if (sessionsData.success) {
        setSessions(sessionsData.sessions || []);
      }

      if (bucketsData.success) {
        setBuckets(bucketsData.buckets || {});
        setStats(bucketsData.stats || null);
      }

      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Database connection failed');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshAll();
  }, []);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(refreshAll, 10000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  // Pipeline totals from database stats
  // Flow: active → captured → flagged → pending → cleaned → archived
  const totals = {
    active: stats?.active || buckets['active'] || 0,
    captured: stats?.captured || buckets['captured'] || 0,
    flagged: stats?.flagged || buckets['flagged'] || 0,
    pending: stats?.pending || buckets['pending'] || 0,
    cleaned: stats?.cleaned || buckets['cleaned'] || 0,
    archived: stats?.archived || buckets['archived'] || 0,
    total: stats?.total_sessions || Object.values(buckets).reduce((sum, c) => sum + c, 0),
    last24h: stats?.last_24h || 0,
  };

  const overallHealth = error ? 'down' : 'healthy';

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gray-800 border-b border-gray-700 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Session Logs</h1>
          <span className="text-sm text-gray-400">Database View</span>
          <HealthBadge health={overallHealth} />
        </div>
        <div className="flex items-center gap-4">
          {lastRefresh && (
            <span className="text-xs text-gray-500">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={refreshAll}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white text-sm rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="px-6 py-2 bg-red-900/50 border-b border-red-700 text-red-300 text-sm">
          Database Error: {error}
        </div>
      )}

      {/* Pipeline Status Bar */}
      {/* Flow: active → captured → flagged → pending → cleaned → archived */}
      <div className="px-6 py-3 bg-gray-800/50 border-b border-gray-700 shrink-0">
        <div className="flex items-center justify-around">
          <TotalStat label="Active" value={totals.active} color="cyan" />
          <PipelineArrow />
          <TotalStat label="Captured" value={totals.captured} color="blue" />
          <PipelineArrow />
          <TotalStat label="Flagged" value={totals.flagged} color="purple" />
          <PipelineArrow />
          <TotalStat label="Pending" value={totals.pending} color="yellow" />
          <PipelineArrow />
          <TotalStat label="Cleaned" value={totals.cleaned} color="teal" />
          <PipelineArrow />
          <TotalStat label="Archived" value={totals.archived} color="green" />
        </div>
        <div className="text-center mt-2 text-xs text-gray-500">
          {totals.total} total sessions | {totals.last24h} in last 24h
        </div>
      </div>

      {/* Main Content - 2 Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Sessions List */}
        <div className="flex-1 flex flex-col border-r border-gray-700 min-w-0">
          <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700 shrink-0">
            <h2 className="text-sm font-medium text-gray-300">Recent Sessions ({sessions.length})</h2>
          </div>
          <div className="flex-1 overflow-auto p-3 space-y-2">
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-3xl mb-2">📭</div>
                <p>No sessions in database</p>
              </div>
            ) : (
              sessions.map(session => (
                <SessionItem key={session.id} session={session} />
              ))
            )}
          </div>
        </div>

        {/* Right: Status Buckets */}
        <div className="w-80 flex flex-col min-w-0">
          <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700 shrink-0">
            <h2 className="text-sm font-medium text-gray-300">Pipeline Buckets</h2>
          </div>
          <div className="flex-1 overflow-auto p-3">
            {Object.keys(buckets).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-3xl mb-2">🗂️</div>
                <p>No bucket data</p>
              </div>
            ) : (
              <div className="space-y-1">
                {Object.entries(buckets)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, count]) => (
                    <BucketRow key={name} name={name} count={count} />
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Pipeline arrow
function PipelineArrow() {
  return <span className="text-gray-600 text-xs">→</span>;
}

// Total stat display
function TotalStat({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    cyan: 'text-cyan-400',
    blue: 'text-blue-400',
    indigo: 'text-indigo-400',
    purple: 'text-purple-400',
    yellow: 'text-yellow-400',
    teal: 'text-teal-400',
    green: 'text-green-400',
  };

  return (
    <div className="text-center">
      <div className={`text-xl font-bold ${colors[color] || 'text-gray-400'}`}>{value}</div>
      <div className="text-[10px] text-gray-500">{label}</div>
    </div>
  );
}

// Session list item
function SessionItem({ session }: { session: Session }) {
  const time = session.started_at ? formatTime(session.started_at) : '??:??';
  const user = session.user_name || session.user_id || 'Unknown';

  // Pipeline: active → captured → flagged → pending → cleaned → archived
  const statusColors: Record<string, string> = {
    active: 'bg-cyan-900/50 text-cyan-400',
    captured: 'bg-blue-900/50 text-blue-400',
    flagged: 'bg-purple-900/50 text-purple-400',
    pending: 'bg-yellow-900/50 text-yellow-400',
    cleaned: 'bg-teal-900/50 text-teal-400',
    archived: 'bg-gray-900/50 text-gray-400',
  };

  return (
    <div className="p-2 rounded border border-gray-700 bg-gray-800/50 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium text-white truncate">{user}</span>
        <span className="text-[10px] text-gray-500 font-mono shrink-0 ml-2">{time}</span>
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-gray-500 truncate">{session.project_path || session.source_name || 'Unknown'}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusColors[session.status || 'captured'] || statusColors.captured}`}>
          {session.status || 'captured'}
        </span>
      </div>
    </div>
  );
}

// Bucket row
// Pipeline: active → captured → flagged → pending → cleaned → archived
function BucketRow({ name, count }: { name: string; count: number }) {
  const bucketColors: Record<string, string> = {
    active: 'bg-cyan-900/20',
    captured: 'bg-blue-900/20',
    flagged: 'bg-purple-900/20',
    pending: 'bg-yellow-900/20',
    cleaned: 'bg-teal-900/20',
    archived: 'bg-gray-800/30',
  };

  return (
    <div className={`flex items-center justify-between py-1.5 px-2 rounded ${bucketColors[name] || 'bg-gray-800/30'}`}>
      <span className={`text-sm truncate ${count > 0 ? 'text-white' : 'text-gray-500'}`}>
        {name}
      </span>
      <span className={`font-mono font-bold min-w-[24px] text-right ${count > 0 ? 'text-white' : 'text-gray-600'}`}>
        {count}
      </span>
    </div>
  );
}

// Health badge
function HealthBadge({ health }: { health: 'healthy' | 'degraded' | 'down' }) {
  const config = {
    healthy: { bg: 'bg-green-600/20', text: 'text-green-400', icon: CheckCircle, label: 'Connected' },
    degraded: { bg: 'bg-yellow-600/20', text: 'text-yellow-400', icon: AlertTriangle, label: 'Degraded' },
    down: { bg: 'bg-red-600/20', text: 'text-red-400', icon: XCircle, label: 'Disconnected' },
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
