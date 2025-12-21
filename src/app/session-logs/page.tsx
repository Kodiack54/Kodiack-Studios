'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

// Service URLs - using the dev droplet
const DEV_DROPLET = '161.35.229.220';

// All 4 team base ports
const TEAMS = [
  { id: 'global', name: 'Global Team', basePort: 5400 },
  { id: 'dev1', name: 'Dev Team 1', basePort: 5410 },
  { id: 'dev2', name: 'Dev Team 2', basePort: 5420 },
  { id: 'dev3', name: 'Dev Team 3', basePort: 5430 },
];

interface TeamStatus {
  name: string;
  chadCaptured: number;
  jenFlagged: number;
  susanFiled: number;
  health: 'healthy' | 'degraded' | 'down';
  error: string | null;
}

interface Session {
  id: string;
  user_name?: string;
  user_id?: string;
  started_at?: string;
  ended_at?: string;
  terminal_port?: number;
  status?: string;
  source_name?: string;
}

interface BucketCounts {
  [key: string]: number;
}

export default function SessionLogsPage() {
  const [teamStatuses, setTeamStatuses] = useState<Record<string, TeamStatus>>({});
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [allBuckets, setAllBuckets] = useState<BucketCounts>({});
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Fetch status from a single team
  const fetchTeamStatus = useCallback(async (team: typeof TEAMS[0]): Promise<TeamStatus> => {
    const chadUrl = `http://${DEV_DROPLET}:${team.basePort + 1}`;
    const jenUrl = `http://${DEV_DROPLET}:${team.basePort + 2}`;
    const susanUrl = `http://${DEV_DROPLET}:${team.basePort + 3}`;

    let chadCaptured = 0;
    let jenFlagged = 0;
    let susanFiled = 0;
    let hasError = false;
    let errorMsg = '';

    try {
      const chadRes = await fetch(`${chadUrl}/api/status`, { cache: 'no-store' });
      if (chadRes.ok) {
        const data = await chadRes.json();
        chadCaptured = data.sessionsCapured ?? data.sessionCount ?? 0;
      }
    } catch {
      hasError = true;
      errorMsg = 'Chad offline';
    }

    try {
      const jenRes = await fetch(`${jenUrl}/api/status`, { cache: 'no-store' });
      if (jenRes.ok) {
        const data = await jenRes.json();
        jenFlagged = data.itemsFlagged ?? 0;
      }
    } catch {
      hasError = true;
      errorMsg = errorMsg ? `${errorMsg}, Jen offline` : 'Jen offline';
    }

    try {
      const susanRes = await fetch(`${susanUrl}/api/status`, { cache: 'no-store' });
      if (susanRes.ok) {
        const data = await susanRes.json();
        susanFiled = data.itemsCategorized ?? 0;
      }
    } catch {
      hasError = true;
      errorMsg = errorMsg ? `${errorMsg}, Susan offline` : 'Susan offline';
    }

    return {
      name: team.name,
      chadCaptured,
      jenFlagged,
      susanFiled,
      health: hasError ? 'down' : 'healthy',
      error: errorMsg || null,
    };
  }, []);

  // Fetch sessions from a team's Chad
  const fetchTeamSessions = useCallback(async (team: typeof TEAMS[0]): Promise<Session[]> => {
    const chadUrl = `http://${DEV_DROPLET}:${team.basePort + 1}`;
    try {
      const res = await fetch(`${chadUrl}/api/sessions/recent`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        return (data.sessions || []).map((s: Session) => ({
          ...s,
          terminal_port: team.basePort,
        }));
      }
    } catch {
      // Silently fail
    }
    return [];
  }, []);

  // Fetch buckets from a team's Jen
  const fetchTeamBuckets = useCallback(async (team: typeof TEAMS[0]): Promise<BucketCounts> => {
    const jenUrl = `http://${DEV_DROPLET}:${team.basePort + 2}`;
    try {
      const res = await fetch(`${jenUrl}/api/buckets`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const rawBuckets = data.buckets || data.categories || data.flags || data;
        let buckets: BucketCounts = {};
        if (Array.isArray(rawBuckets)) {
          rawBuckets.forEach((b: { name?: string; count?: number }) => {
            buckets[b.name || 'Unknown'] = b.count ?? 0;
          });
        } else if (typeof rawBuckets === 'object') {
          buckets = { ...rawBuckets };
        }
        return buckets;
      }
    } catch {
      // Silently fail
    }
    return {};
  }, []);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    setLoading(true);

    // Fetch all team statuses in parallel
    const statusPromises = TEAMS.map(team => fetchTeamStatus(team));
    const statuses = await Promise.all(statusPromises);

    const statusMap: Record<string, TeamStatus> = {};
    TEAMS.forEach((team, i) => {
      statusMap[team.id] = statuses[i];
    });
    setTeamStatuses(statusMap);

    // Fetch all sessions in parallel
    const sessionPromises = TEAMS.map(team => fetchTeamSessions(team));
    const sessionArrays = await Promise.all(sessionPromises);
    const combined = sessionArrays.flat().sort((a, b) => {
      const aTime = new Date(a.started_at || 0).getTime();
      const bTime = new Date(b.started_at || 0).getTime();
      return bTime - aTime; // Most recent first
    });
    setAllSessions(combined.slice(0, 50)); // Limit to 50 most recent

    // Fetch all buckets in parallel and combine
    const bucketPromises = TEAMS.map(team => fetchTeamBuckets(team));
    const bucketArrays = await Promise.all(bucketPromises);
    const combinedBuckets: BucketCounts = {};
    bucketArrays.forEach(buckets => {
      Object.entries(buckets).forEach(([key, count]) => {
        combinedBuckets[key] = (combinedBuckets[key] || 0) + count;
      });
    });
    setAllBuckets(combinedBuckets);

    setLastRefresh(new Date());
    setLoading(false);
  }, [fetchTeamStatus, fetchTeamSessions, fetchTeamBuckets]);

  // Initial load
  useEffect(() => {
    refreshAll();
  }, []);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(refreshAll, 10000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  // Calculate totals
  const totals = {
    captured: Object.values(teamStatuses).reduce((sum, t) => sum + t.chadCaptured, 0),
    flagged: Object.values(teamStatuses).reduce((sum, t) => sum + t.jenFlagged, 0),
    filed: Object.values(teamStatuses).reduce((sum, t) => sum + t.susanFiled, 0),
    pending: Object.values(allBuckets).reduce((sum, c) => sum + c, 0),
  };

  const overallHealth = Object.values(teamStatuses).some(t => t.health === 'down')
    ? 'down'
    : Object.values(teamStatuses).some(t => t.health === 'degraded')
    ? 'degraded'
    : 'healthy';

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gray-800 border-b border-gray-700 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Session Logs</h1>
          <span className="text-sm text-gray-400">All Development Teams</span>
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

      {/* Team Summary Cards */}
      <div className="p-4 bg-gray-850 border-b border-gray-700 shrink-0">
        <div className="grid grid-cols-4 gap-4">
          {TEAMS.map(team => {
            const status = teamStatuses[team.id];
            return (
              <TeamCard key={team.id} team={team} status={status} />
            );
          })}
        </div>
      </div>

      {/* Totals Bar */}
      <div className="px-6 py-3 bg-gray-800/50 border-b border-gray-700 flex items-center justify-around shrink-0">
        <TotalStat label="Captured" value={totals.captured} color="blue" />
        <TotalStat label="Flagged" value={totals.flagged} color="purple" />
        <TotalStat label="Filed" value={totals.filed} color="green" />
        <TotalStat label="Pending" value={totals.pending} color="yellow" />
      </div>

      {/* Main Content - 2 Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Sessions List */}
        <div className="flex-1 flex flex-col border-r border-gray-700 min-w-0">
          <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700 shrink-0">
            <h2 className="text-sm font-medium text-gray-300">Recent Sessions ({allSessions.length})</h2>
          </div>
          <div className="flex-1 overflow-auto p-3 space-y-2">
            {allSessions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-3xl mb-2">📭</div>
                <p>No sessions captured yet</p>
              </div>
            ) : (
              allSessions.map(session => (
                <SessionItem key={session.id} session={session} />
              ))
            )}
          </div>
        </div>

        {/* Right: Buckets */}
        <div className="w-80 flex flex-col min-w-0">
          <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700 shrink-0">
            <h2 className="text-sm font-medium text-gray-300">Flagged Buckets (All Teams)</h2>
          </div>
          <div className="flex-1 overflow-auto p-3">
            {Object.keys(allBuckets).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-3xl mb-2">🏷️</div>
                <p>No items flagged yet</p>
              </div>
            ) : (
              <div className="space-y-1">
                {Object.entries(allBuckets)
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

// Team summary card
function TeamCard({ team, status }: { team: typeof TEAMS[0]; status?: TeamStatus }) {
  const healthColors = {
    healthy: 'border-green-500/50 bg-green-900/20',
    degraded: 'border-yellow-500/50 bg-yellow-900/20',
    down: 'border-red-500/50 bg-red-900/20',
  };

  if (!status) {
    return (
      <div className="p-3 rounded-lg border border-gray-700 bg-gray-800/50">
        <div className="text-sm font-medium text-gray-300 mb-2">{team.name}</div>
        <div className="text-xs text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className={`p-3 rounded-lg border ${healthColors[status.health]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-white">{team.name}</span>
        <span className={`w-2 h-2 rounded-full ${
          status.health === 'healthy' ? 'bg-green-400' :
          status.health === 'degraded' ? 'bg-yellow-400' : 'bg-red-400'
        }`} />
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-lg font-bold text-blue-400">{status.chadCaptured}</div>
          <div className="text-[10px] text-gray-500">Captured</div>
        </div>
        <div>
          <div className="text-lg font-bold text-purple-400">{status.jenFlagged}</div>
          <div className="text-[10px] text-gray-500">Flagged</div>
        </div>
        <div>
          <div className="text-lg font-bold text-green-400">{status.susanFiled}</div>
          <div className="text-[10px] text-gray-500">Filed</div>
        </div>
      </div>
      {status.error && (
        <div className="mt-2 text-[10px] text-red-400 truncate">{status.error}</div>
      )}
    </div>
  );
}

// Total stat display
function TotalStat({ label, value, color }: { label: string; value: number; color: 'blue' | 'purple' | 'green' | 'yellow' }) {
  const colors = {
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
  };

  return (
    <div className="text-center">
      <div className={`text-2xl font-bold ${colors[color]}`}>{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

// Session list item
function SessionItem({ session }: { session: Session }) {
  const time = session.started_at ? formatTime(session.started_at) : '??:??';
  const user = session.user_name || session.user_id || 'Unknown';
  const teamName = getTeamName(session.terminal_port);

  const statusColors: Record<string, string> = {
    captured: 'bg-blue-900/50 text-blue-400',
    pending: 'bg-yellow-900/50 text-yellow-400',
    scrubbed: 'bg-purple-900/50 text-purple-400',
    flagged: 'bg-orange-900/50 text-orange-400',
    filed: 'bg-green-900/50 text-green-400',
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
        <span className="text-xs text-gray-500">{teamName}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusColors[session.status || 'captured'] || statusColors.captured}`}>
          {session.status || 'Captured'}
        </span>
      </div>
    </div>
  );
}

// Bucket row
function BucketRow({ name, count }: { name: string; count: number }) {
  return (
    <div className={`flex items-center justify-between py-1.5 px-2 rounded ${
      count > 0 ? 'bg-purple-900/20' : 'bg-gray-800/30'
    }`}>
      <span className={`text-sm truncate ${count > 0 ? 'text-white' : 'text-gray-500'}`}>
        {name}
      </span>
      <span className={`font-mono font-bold min-w-[24px] text-right ${
        count > 0 ? 'text-purple-400' : 'text-gray-600'
      }`}>
        {count}
      </span>
    </div>
  );
}

// Health badge
function HealthBadge({ health }: { health: 'healthy' | 'degraded' | 'down' }) {
  const config = {
    healthy: { bg: 'bg-green-600/20', text: 'text-green-400', icon: CheckCircle, label: 'Healthy' },
    degraded: { bg: 'bg-yellow-600/20', text: 'text-yellow-400', icon: AlertTriangle, label: 'Degraded' },
    down: { bg: 'bg-red-600/20', text: 'text-red-400', icon: XCircle, label: 'Issues' },
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

function getTeamName(port?: number): string {
  if (!port) return 'Unknown';
  if (port === 5400) return 'Global';
  const teamNum = Math.floor((port - 5400) / 10);
  return `Dev Team ${teamNum}`;
}
