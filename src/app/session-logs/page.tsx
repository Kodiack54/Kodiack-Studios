'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

// ALL data comes from DATABASE - no HTTP calls to workers
// Workers write TO database, dashboard reads FROM database

// All 4 team workspaces
const TEAMS = [
  { id: 'global', name: 'Global Team', workspace: 'global' },
  { id: 'dev1', name: 'Dev Team 1', workspace: 'dev1' },
  { id: 'dev2', name: 'Dev Team 2', workspace: 'dev2' },
  { id: 'dev3', name: 'Dev Team 3', workspace: 'dev3' },
];

// Jen's 20 extraction buckets
const JEN_BUCKETS = [
  'Bugs Open', 'Bugs Fixed', 'Todos', 'Journal', 'Work Log', 'Ideas',
  'Decisions', 'Lessons', 'System Breakdown', 'How-To Guide', 'Schematic',
  'Reference', 'Naming Conventions', 'File Structure', 'Database Patterns',
  'API Patterns', 'Component Patterns', 'Quirks & Gotchas', 'Snippets', 'Other'
];

interface TeamStatus {
  captured: number;
  flagged: number;
  filed: number;
}

interface Session {
  id: string;
  user_name?: string;
  user_id?: string;
  started_at?: string;
  ended_at?: string;
  terminal_port?: number;
  status?: string;
  source_type?: string;
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

interface Project {
  id: string;
  name: string;
  slug?: string;
  server_path?: string;
  parent_id?: string | null;
  todos: number;
  knowledge: number;
  bugs: number;
}

export default function SessionLogsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [buckets, setBuckets] = useState<BucketCounts>({});
  const [jenBuckets, setJenBuckets] = useState<BucketCounts>({});
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [teamStatuses, setTeamStatuses] = useState<Record<string, TeamStatus>>({});
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch all data from database
  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch sessions, pipeline buckets, Jen's extraction buckets, and projects
      const [sessionsRes, bucketsRes, extractionsRes, projectsListRes, projectsSummaryRes] = await Promise.all([
        fetch('/api/ai-sessions?limit=100', { cache: 'no-store' }),
        fetch('/api/ai-sessions/buckets', { cache: 'no-store' }),
        fetch('/api/ai-extractions', { cache: 'no-store' }),
        fetch('/project-management/api/projects', { cache: 'no-store' }),
        fetch('/project-management/api/projects/summary', { cache: 'no-store' }),
      ]);

      if (!sessionsRes.ok || !bucketsRes.ok) {
        throw new Error('Failed to fetch from database');
      }

      const sessionsData = await sessionsRes.json();
      const bucketsData = await bucketsRes.json();
      const extractionsData = extractionsRes.ok ? await extractionsRes.json() : { success: false };
      const projectsListData = projectsListRes.ok ? await projectsListRes.json() : { success: false };
      const projectsSummaryData = projectsSummaryRes.ok ? await projectsSummaryRes.json() : { success: false };

      if (sessionsData.success) {
        setSessions(sessionsData.sessions || []);
      }

      if (bucketsData.success) {
        setBuckets(bucketsData.buckets || {});
        setStats(bucketsData.stats || null);
      }

      if (extractionsData.success) {
        setJenBuckets(extractionsData.buckets || {});
      }

      // Merge projects list with summaries - only parent projects (no parent_id)
      if (projectsListData.success && projectsListData.projects) {
        const summaries = projectsSummaryData.success ? projectsSummaryData.summaries || {} : {};
        const parentProjects = projectsListData.projects
          .filter((p: { parent_id?: string | null }) => !p.parent_id)
          .map((p: { id: string; name: string; slug?: string; server_path?: string }) => {
            const summary = summaries[p.id] || {};
            return {
              id: p.id,
              name: p.name,
              slug: p.slug,
              server_path: p.server_path,
              parent_id: null,
              todos: summary.todos?.total || 0,
              knowledge: summary.knowledge || 0,
              bugs: summary.bugs || 0,
            };
          });
        setProjects(parentProjects);
      }

      // Fetch each team's stats
      const teamPromises = TEAMS.map(async (team) => {
        try {
          const res = await fetch(`/api/ai-sessions/buckets?workspace=${team.workspace}`, { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            const s = data.stats || {};
            return {
              id: team.id,
              status: {
                captured: Number(s.active || 0) + Number(s.captured || 0),
                flagged: Number(s.flagged || 0),
                filed: Number(s.pending || 0) + Number(s.cleaned || 0) + Number(s.archived || 0),
              }
            };
          }
        } catch {}
        return { id: team.id, status: { captured: 0, flagged: 0, filed: 0 } };
      });

      const teamResults = await Promise.all(teamPromises);
      const statusMap: Record<string, TeamStatus> = {};
      teamResults.forEach(r => { statusMap[r.id] = r.status; });
      setTeamStatuses(statusMap);

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

  // Auto-refresh every 5 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(refreshAll, 5000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  // Pipeline totals from database stats
  // Flow: active → captured → flagged → pending → cleaned → archived
  const totals = {
    active: Number(stats?.active || buckets['active'] || 0),
    captured: Number(stats?.captured || buckets['captured'] || 0),
    flagged: Number(stats?.flagged || buckets['flagged'] || 0),
    pending: Number(stats?.pending || buckets['pending'] || 0),
    cleaned: Number(stats?.cleaned || buckets['cleaned'] || 0),
    archived: Number(stats?.archived || buckets['archived'] || 0),
    total: Number(stats?.total_sessions || Object.values(buckets).reduce((sum, c) => sum + Number(c), 0)),
    last24h: Number(stats?.last_24h || 0),
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

      {/* Team Summary Cards */}
      <div className="p-4 bg-gray-850 border-b border-gray-700 shrink-0">
        <div className="grid grid-cols-4 gap-4">
          {TEAMS.map(team => {
            const status = teamStatuses[team.id] || { captured: 0, flagged: 0, filed: 0 };
            return (
              <div key={team.id} className="p-3 rounded-lg border border-gray-700 bg-gray-800/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-white">{team.name}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-lg font-bold text-blue-400">{status.captured}</div>
                    <div className="text-[10px] text-gray-500">Captured</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-purple-400">{status.flagged}</div>
                    <div className="text-[10px] text-gray-500">Flagged</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-400">{status.filed}</div>
                    <div className="text-[10px] text-gray-500">Filed</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pipeline Header Row: 3/4 header | 1/4 pipeline buckets */}
      <div className="flex border-b border-gray-700 shrink-0">
        {/* 3/4 Pipeline Header */}
        <div className="flex-[3] px-4 py-3 bg-gray-800/50 border-r border-gray-700">
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

        {/* 1/4 Pipeline Buckets (compact) */}
        <div className="flex-1 px-3 py-2 bg-gray-800/50">
          <div className="space-y-0.5">
            {['active', 'captured', 'flagged', 'pending', 'cleaned', 'archived'].map(name => (
              <div key={name} className="flex items-center justify-between text-xs">
                <span className="text-gray-400 capitalize">{name}</span>
                <span className="font-mono font-bold text-white">{buckets[name] || 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content - 3 equal columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* Column 1: Chad's Session Logs */}
        <div className="flex-1 flex flex-col border-r border-gray-700 min-w-0">
          <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700 shrink-0">
            <h2 className="text-sm font-medium text-gray-300">Chad's Sessions ({sessions.length})</h2>
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

        {/* Column 2: Jen's Flagged Buckets */}
        <div className="flex-1 flex flex-col border-r border-gray-700 min-w-0">
          <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700 shrink-0">
            <h2 className="text-sm font-medium text-gray-300">Jen's Flagged Items</h2>
          </div>
          <div className="flex-1 overflow-auto p-3">
            <div className="space-y-1">
              {JEN_BUCKETS.map(name => (
                <BucketRow key={name} name={name} count={jenBuckets[name] || 0} />
              ))}
            </div>
          </div>
        </div>

        {/* Column 3: Susan's Projects */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700 shrink-0">
            <h2 className="text-sm font-medium text-gray-300">Susan's Projects ({projects.length})</h2>
          </div>
          <div className="flex-1 overflow-auto p-3">
            <div className="space-y-2">
              {projects.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-3xl mb-2">📁</div>
                  <p>No projects</p>
                </div>
              ) : (
                projects.map(project => (
                  <ProjectCard key={project.id} project={project} />
                ))
              )}
            </div>
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
  const datetime = session.started_at ? formatDateTime(session.started_at) : '??:??';

  // Display logic: show meaningful names based on source
  const getDisplayName = () => {
    // AI session types - differentiate by terminal port
    if (session.source_type === 'internal_claude') {
      const port = session.terminal_port;
      if (port === 5400) return 'Internal Claude (Main)';
      if (port === 5410) return 'Internal Claude (Dev Team 1)';
      if (port === 5420) return 'Internal Claude (Dev Team 2)';
      if (port === 5430) return 'Internal Claude (Dev Team 3)';
      return 'Internal Claude';
    }
    if (session.source_type === 'external') {
      return 'External Claude';
    }
    if (session.source_type === 'chat_systems') {
      return 'Chat Systems';
    }
    // Show source_name if available
    if (session.source_name && session.source_name.trim()) {
      return session.source_name;
    }
    // Show user name
    if (session.user_name && session.user_name.trim()) {
      return session.user_name;
    }
    // Don't show raw UUIDs
    if (session.user_id && !session.user_id.includes('-')) {
      return session.user_id;
    }
    return 'Unknown';
  };

  const user = getDisplayName();

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
        <span className="text-[10px] text-gray-500 font-mono shrink-0 ml-2">{datetime}</span>
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

// Project card for Susan's column
function ProjectCard({ project }: { project: Project }) {
  const total = project.todos + project.knowledge + project.bugs;
  return (
    <div className="p-2 rounded border border-gray-700 bg-gray-800/50 hover:bg-gray-700/50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="font-medium text-white text-sm truncate">{project.name}</div>
        {total > 0 && (
          <span className="text-xs text-gray-400 ml-2">{total}</span>
        )}
      </div>
      <div className="flex items-center gap-3 mt-1.5 text-xs">
        <span className={project.todos > 0 ? 'text-blue-400' : 'text-gray-600'}>
          To-do: {project.todos}
        </span>
        <span className={project.knowledge > 0 ? 'text-green-400' : 'text-gray-600'}>
          Knowledge: {project.knowledge}
        </span>
        <span className={project.bugs > 0 ? 'text-red-400' : 'text-gray-600'}>
          Bugs: {project.bugs}
        </span>
      </div>
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

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  if (isToday) {
    return `Today ${time}`;
  } else if (isYesterday) {
    return `Yesterday ${time}`;
  } else {
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${dateStr} ${time}`;
  }
}
