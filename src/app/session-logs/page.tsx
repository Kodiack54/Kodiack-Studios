'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, CheckCircle, XCircle, Search, Calendar, Filter, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Session {
  id: string;
  user_name?: string;
  started_at?: string;
  ended_at?: string;
  terminal_port?: number;
  status?: string;
  source_type?: string;
  source_name?: string;
  mode?: string;
  project_id?: string;
  project_slug?: string;
  project_name?: string;
}

interface Worklog {
  ts_id: string;
  mode: string;
  briefing: string;
  segment_start: string;
  segment_end: string;
  duration_hours: number;
  status: string;
  project_slug: string | null;
  project_name: string | null;
  session_count: number;
  created_at: string;
}

interface Project {
  id: string;
  slug: string;
  name: string;
}

interface PipelineStats {
  active: number;
  processed: number;
  cleaned: number;
  extracted: number;
  archived: number;
  total: number;
}

export default function SessionLogsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [worklogs, setWorklogs] = useState<Worklog[]>([]);
  const [stats, setStats] = useState<PipelineStats>({ active: 0, processed: 0, cleaned: 0, extracted: 0, archived: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [modeFilter, setModeFilter] = useState<string>('');
  const [projectFilter, setProjectFilter] = useState<string>('');
  const [sourceTypeFilter, setSourceTypeFilter] = useState<string>(''); // NEW: All/Internal/External
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);

  // Static modes list
  const MODES = ['project', 'forge', 'support', 'planning', 'other'];
  const [dateFilter, setDateFilter] = useState<string>('');

  // Fetch all data
  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [sessionsRes, bucketsRes, worklogsRes, projectsRes] = await Promise.all([
        fetch('/session-logs/api/sessions?limit=50', { cache: 'no-store' }),
        fetch('/session-logs/api/sessions/buckets', { cache: 'no-store' }),
        fetch('/session-logs/api?limit=100', { cache: 'no-store' }),
        fetch('/api/projects?parents_only=true', { cache: 'no-store' }),
      ]);

      if (sessionsRes.ok) {
        const data = await sessionsRes.json();
        setSessions(data.sessions || []);
      }

      if (bucketsRes.ok) {
        const data = await bucketsRes.json();
        const s = data.stats || {};
        setStats({
          active: Number(s.active || 0),
          processed: Number(s.processed || 0),
          cleaned: Number(s.cleaned || 0),
          extracted: Number(s.extracted || 0),
          archived: Number(s.archived || 0),
          total: Number(s.total_sessions || 0),
        });
      }

      if (worklogsRes.ok) {
        const data = await worklogsRes.json();
        setWorklogs(data.worklogs || []);
      }

      if (projectsRes.ok) {
        const data = await projectsRes.json();
        setAvailableProjects(data.projects || []);
      }

      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 10000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  // Filter sessions by source type
  const filteredSessions = sessions.filter(s => {
    if (!sourceTypeFilter) return true;
    return s.source_type === sourceTypeFilter;
  });

  // Count sessions by source type for filter badges
  const sessionCounts = {
    total: sessions.length,
    internal: sessions.filter(s => s.source_type === 'internal_claude').length,
    external: sessions.filter(s => s.source_type === 'external_claude').length,
  };

  // Filter worklogs
  const filteredWorklogs = worklogs.filter(w => {
    if (modeFilter && w.mode !== modeFilter) return false;
    if (projectFilter && w.project_slug !== projectFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matches =
        w.ts_id?.toLowerCase().includes(q) ||
        w.briefing?.toLowerCase().includes(q) ||
        w.project_slug?.toLowerCase().includes(q) ||
        w.mode?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    return true;
  });

  // Get unique values for filters
  // Modes are now static MODES constant
  // Projects are now fetched from API

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gray-800 border-b border-gray-700 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Session Library</h1>
          <HealthBadge health={error ? 'down' : 'healthy'} />
        </div>
        <div className="flex items-center gap-4">
          {lastRefresh && (
            <span className="text-xs text-gray-500">
              Updated: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={refreshAll}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white text-sm rounded-lg"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* 5-Stage Pipeline */}
      <div className="border-b border-gray-700 shrink-0 px-4 py-3 bg-gray-800/50">
        <div className="flex items-center justify-around">
          <PipelineStage label="Active" value={stats.active} color="cyan" owner="Chad" />
          <PipelineArrow />
          <PipelineStage label="Processed" value={stats.processed} color="blue" owner="Jen" />
          <PipelineArrow />
          <PipelineStage label="Cleaned" value={stats.cleaned} color="teal" owner="Susan" />
          <PipelineArrow />
          <PipelineStage label="Extracted" value={stats.extracted} color="purple" owner="Claude" />
          <PipelineArrow />
          <PipelineStage label="Archived" value={stats.archived} color="green" owner="Susan" />
        </div>
        <div className="text-center mt-2 text-xs text-gray-500">
          {stats.total} total sessions
        </div>
      </div>

      {/* Main Content - 2 columns: Chad's Sessions | Worklog Library */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Chad's Sessions */}
        <div className="w-96 flex flex-col border-r border-gray-700 shrink-0">
          <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700">
            <h2 className="text-sm font-medium text-gray-300 mb-2">Recent Sessions ({filteredSessions.length})</h2>
            {/* Source Type Filter Pills */}
            <div className="flex gap-1">
              <button
                onClick={() => setSourceTypeFilter('')}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  !sourceTypeFilter
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                All ({sessionCounts.total})
              </button>
              <button
                onClick={() => setSourceTypeFilter('internal_claude')}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  sourceTypeFilter === 'internal_claude'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                Internal ({sessionCounts.internal})
              </button>
              <button
                onClick={() => setSourceTypeFilter('external_claude')}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  sourceTypeFilter === 'external_claude'
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                External ({sessionCounts.external})
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-2 space-y-1">
            {filteredSessions.map(session => (
              <SessionRow key={session.id} session={session} />
            ))}
            {filteredSessions.length === 0 && (
              <div className="text-center py-8 text-gray-500 text-sm">
                No {sourceTypeFilter === 'external_claude' ? 'external' : sourceTypeFilter === 'internal_claude' ? 'internal' : ''} sessions found
              </div>
            )}
          </div>
        </div>

        {/* Right: Worklog Library */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Library Controls */}
          <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-700 flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search worklogs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Mode Filter */}
            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">All Modes</option>
              {MODES.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            {/* Project Filter */}
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">All Projects</option>
              {availableProjects.map(p => (
                <option key={p.id} value={p.slug}>{p.name}</option>
              ))}
            </select>

            <span className="text-sm text-gray-400 ml-auto">
              {filteredWorklogs.length} worklogs
            </span>
          </div>

          {/* Worklog Cards */}
          <div className="flex-1 overflow-auto p-4">
            {filteredWorklogs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-3">📚</div>
                <p className="text-lg">No worklogs yet</p>
                <p className="text-sm mt-1">Worklogs will appear here as sessions are cleaned</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredWorklogs.map(worklog => (
                  <WorklogCard
                    key={worklog.ts_id}
                    worklog={worklog}
                    onClick={() => router.push(`/session-logs/${worklog.ts_id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PipelineArrow() {
  return <span className="text-gray-600 text-lg">→</span>;
}

function PipelineStage({ label, value, color, owner }: { label: string; value: number; color: string; owner: string }) {
  const colors: Record<string, string> = {
    cyan: 'text-cyan-400 bg-cyan-900/30',
    blue: 'text-blue-400 bg-blue-900/30',
    teal: 'text-teal-400 bg-teal-900/30',
    purple: 'text-purple-400 bg-purple-900/30',
    green: 'text-green-400 bg-green-900/30',
  };
  const c = colors[color] || 'text-gray-400 bg-gray-800';

  return (
    <div className={`text-center px-4 py-2 rounded-lg ${c.split(' ')[1]}`}>
      <div className={`text-2xl font-bold ${c.split(' ')[0]}`}>{value}</div>
      <div className="text-xs text-white font-medium">{label}</div>
      <div className="text-[10px] text-gray-500">{owner}</div>
    </div>
  );
}

function SessionRow({ session }: { session: Session }) {
  const time = session.started_at ? formatTime(session.started_at) : '??:??';
  const statusColors: Record<string, string> = {
    active: 'bg-cyan-900/50 text-cyan-400',
    processed: 'bg-blue-900/50 text-blue-400',
    cleaned: 'bg-teal-900/50 text-teal-400',
    extracted: 'bg-purple-900/50 text-purple-400',
    archived: 'bg-gray-800 text-gray-400',
  };

  // Determine source type and display name - source_type is the PRIMARY key
  const isExternal = session.source_type === 'external_claude';
  const isInternal = session.source_type === 'internal_claude';

  // Display name based on source_type FIRST, then fallback to parsing
  let displayName = 'Session';
  let sourceSubtext = '';

  if (isExternal) {
    displayName = 'External Claude (PC)';
    // Show truncated source_name as subtext if it's a UUID filename
    if (session.source_name) {
      const match = session.source_name.match(/([a-f0-9-]+)\.json/i);
      sourceSubtext = match ? `...${match[1].slice(-8)}` : '';
    }
  } else if (isInternal) {
    const port = session.terminal_port || (session.source_name?.match(/terminal-(\d+)/)?.[1]);
    displayName = port ? `Terminal ${port}` : 'Internal Claude';
    // Show bucket as subtext
    if (session.source_name) {
      const bucketMatch = session.source_name.match(/\/([a-z0-9]+)$/i);
      sourceSubtext = bucketMatch ? bucketMatch[1].slice(0, 8) : '';
    }
  } else {
    // Unknown source_type - fallback to old logic
    if (session.terminal_port) {
      displayName = `Terminal ${session.terminal_port}`;
    } else if (session.source_name) {
      displayName = session.source_name.slice(0, 20);
    }
  }

  // Get project display name (prefer name over slug)
  const projectDisplay = session.project_name ? session.project_name : (session.project_slug && session.project_slug !== 'unassigned'
    ? session.project_slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : 'Unrouted');

  // Mode badge (worklog/forge/planning)
  const modeDisplay = session.mode || '';
  const modeColors: Record<string, string> = {
    worklog: 'bg-blue-600/50 text-blue-300',
    forge: 'bg-purple-600/50 text-purple-300',
    planning: 'bg-yellow-600/50 text-yellow-300',
    support: 'bg-green-600/50 text-green-300',
  };

  // Source type badge colors
  const sourceBadge = isExternal
    ? { text: 'EXT', bg: 'bg-teal-600', textColor: 'text-white' }
    : isInternal
    ? { text: 'INT', bg: 'bg-blue-600', textColor: 'text-white' }
    : { text: '???', bg: 'bg-gray-600', textColor: 'text-gray-300' };

  return (
    <div className={`p-2 rounded border ${isExternal ? 'border-teal-700/50' : 'border-gray-700'} bg-gray-800/50 text-xs`}>
      <div className="flex items-center gap-2">
        {/* Source Type Badge - always visible */}
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${sourceBadge.bg} ${sourceBadge.textColor} shrink-0`}>
          {sourceBadge.text}
        </span>
        <span className="font-medium text-white truncate flex-1">
          {displayName}
        </span>
        <span className="text-gray-500 font-mono shrink-0">{time}</span>
      </div>
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-2 truncate">
          <span className="text-gray-400 truncate">
            {projectDisplay}
          </span>
          {modeDisplay && (
            <span className={`px-1.5 py-0.5 rounded text-[10px] ${modeColors[modeDisplay.toLowerCase()] || 'bg-gray-600/50 text-gray-300'}`}>
              {modeDisplay}
            </span>
          )}
        </div>
        <span className={`px-1.5 py-0.5 rounded text-[10px] ${statusColors[session.status || 'active']}`}>
          {session.status || 'active'}
        </span>
      </div>
    </div>
  );
}

function WorklogCard({ worklog, onClick }: { worklog: Worklog; onClick: () => void }) {
  const timeRange = formatTimeRange(worklog.segment_start, worklog.segment_end);
  const duration = formatDuration(worklog.duration_hours);

  const modeColors: Record<string, string> = {
    project: 'bg-blue-600',
    forge: 'bg-purple-600',
    support: 'bg-green-600',
    planning: 'bg-yellow-600',
    other: 'bg-gray-600',
  };

  return (
    <div
      onClick={onClick}
      className="p-4 rounded-lg border border-gray-700 bg-gray-800/50 hover:bg-gray-800 hover:border-gray-600 cursor-pointer transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Header: TS ID + Project + Mode */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-white">{worklog.ts_id}</span>
            {(worklog.project_name || worklog.project_slug) && (
              <span className="text-sm text-gray-400">{worklog.project_name || worklog.project_slug}</span>
            )}
            <span className={`px-2 py-0.5 rounded text-xs text-white ${modeColors[worklog.mode?.toLowerCase()] || modeColors.other}`}>
              {worklog.mode || 'Other'}
            </span>
          </div>

          {/* Time + Duration */}
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
            <span>{timeRange}</span>
            <span>•</span>
            <span>{duration}</span>
            {worklog.session_count > 1 && (
              <>
                <span>•</span>
                <span>{worklog.session_count} sessions</span>
              </>
            )}
          </div>

          {/* Briefing */}
          <p className="mt-2 text-sm text-gray-300 line-clamp-2">
            {worklog.briefing || 'No briefing available'}
          </p>
        </div>

        <ChevronRight className="w-5 h-5 text-gray-600 shrink-0" />
      </div>
    </div>
  );
}

function HealthBadge({ health }: { health: 'healthy' | 'down' }) {
  if (health === 'healthy') {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-green-600/20">
        <CheckCircle className="w-3.5 h-3.5 text-green-400" />
        <span className="text-xs font-medium text-green-400">Connected</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-red-600/20">
      <XCircle className="w-3.5 h-3.5 text-red-400" />
      <span className="text-xs font-medium text-red-400">Error</span>
    </div>
  );
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatTimeRange(start: string, end: string): string {
  if (!start) return 'Unknown time';
  const s = new Date(start);
  const e = end ? new Date(end) : s;
  
  const startTime = s.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const endTime = e.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  
  const date = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  
  return `${date} ${startTime}–${endTime}`;
}

function formatDuration(hours: number): string {
  if (!hours || hours <= 0) return '0m';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
