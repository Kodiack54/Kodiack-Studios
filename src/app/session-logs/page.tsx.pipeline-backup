'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle, ChevronDown, ChevronRight } from 'lucide-react';
import Link from 'next/link';

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
  active: number;      // Chad: active sessions
  processed: number;   // Jen: processed (structure extracted)
  extracted: number;   // Claude: semantic extraction done
  cleaned: number;     // Susan: cleaned
  archived: number;    // Susan: archived
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
  // Context fields from Chad's resolver
  mode?: string;
  project_id?: string;
  project_slug?: string;
  pc_tag?: string;
}

interface BucketCounts {
  [key: string]: number;
}

interface DatabaseStats {
  total_sessions: number;
  // 5-stage session lifecycle
  active: number;
  processed: number;
  extracted: number;
  cleaned: number;
  archived: number;
  // Item counts
  flagged: number;
  pending: number;
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
  children?: Project[];
}

interface SusanProject {
  isParent?: boolean;
  children?: SusanProject[];
  id: string;
  name: string;
  todos: number;      // status = 'unassigned'
  bugs: number;       // status = 'open'
  knowledge: number;  // status = 'pending' (includes docs, snippets)
  structure: number;  // conventions only (active)
  total: number;
}

interface ClairProject {
  id: string;
  name: string;
  todos: number;      // status = 'assigned'
  bugs: number;       // status = 'open'
  knowledge: number;  // status = 'published'
  structure: number;  // conventions only
  total: number;
}

export default function SessionLogsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [buckets, setBuckets] = useState<BucketCounts>({});
  const [jenBuckets, setJenBuckets] = useState<BucketCounts>({});
  const [projects, setProjects] = useState<Project[]>([]);
  const [susanProjects, setSusanProjects] = useState<SusanProject[]>([]);
  const [susanTotals, setSusanTotals] = useState({ todos: 0, bugs: 0, knowledge: 0, structure: 0, total: 0 });
  const [clairProjects, setClairProjects] = useState<ClairProject[]>([]);
  const [clairTotals, setClairTotals] = useState({ todos: 0, bugs: 0, knowledge: 0, structure: 0, total: 0 });
  const [projectOrder, setProjectOrder] = useState<string[]>([]); // Custom order for projects
  const [draggedProject, setDraggedProject] = useState<string | null>(null);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [teamStatuses, setTeamStatuses] = useState<Record<string, TeamStatus>>({});
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [externalClaudeHealth, setExternalClaudeHealth] = useState<'healthy' | 'missed'>('healthy');

  // Fetch all data from database
  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all data
      const [sessionsRes, bucketsRes, extractionsRes, susanRes, clairRes, projectsListRes, projectsSummaryRes] = await Promise.all([
        fetch('/session-logs/api/sessions?limit=100', { cache: 'no-store' }),
        fetch('/session-logs/api/sessions/buckets', { cache: 'no-store' }),
        fetch('/session-logs/api/extractions', { cache: 'no-store' }),
        fetch('/session-logs/api/extractions/by-project', { cache: 'no-store' }),
        fetch('/session-logs/api/extractions/clair', { cache: 'no-store' }),
        fetch('/project-management/api/projects', { cache: 'no-store' }),
        fetch('/project-management/api/projects/summary', { cache: 'no-store' }),
      ]);

      if (!sessionsRes.ok || !bucketsRes.ok) {
        throw new Error('Failed to fetch from database');
      }

      const sessionsData = await sessionsRes.json();
      const bucketsData = await bucketsRes.json();
      const extractionsData = extractionsRes.ok ? await extractionsRes.json() : { success: false };
      const susanData = susanRes.ok ? await susanRes.json() : { success: false };
      const clairData = clairRes.ok ? await clairRes.json() : { success: false };
      const projectsListData = projectsListRes.ok ? await projectsListRes.json() : { success: false };
      const projectsSummaryData = projectsSummaryRes.ok ? await projectsSummaryRes.json() : { success: false };

      if (sessionsData.success) {
        setSessions(sessionsData.sessions || []);

        // Check Transcript capture health - Chad should capture every 15 min
        // Match by source_type === 'transcript' (from transcripts-9500 via Chad)
        const transcriptSessions = (sessionsData.sessions || []).filter(
          (s: Session) => s.source_type === 'transcript'
        );
        if (transcriptSessions.length > 0) {
          const mostRecent = transcriptSessions[0]; // Already sorted by started_at desc
          const lastCapture = new Date(mostRecent.started_at || 0);
          const now = new Date();
          const minutesSince = (now.getTime() - lastCapture.getTime()) / (1000 * 60);
          // Allow 18 min buffer (15 min interval + 3 min grace)
          setExternalClaudeHealth(minutesSince <= 18 ? 'healthy' : 'missed');
        } else {
          setExternalClaudeHealth('missed'); // No transcript sessions = Chad not capturing
        }
      }

      if (bucketsData.success) {
        setBuckets(bucketsData.buckets || {});
        setStats(bucketsData.stats || null);
      }

      if (extractionsData.success) {
        setJenBuckets(extractionsData.buckets || {});
      }

      // Susan totals from by-project (truth for everything, including unrouted)
      if (susanData.ok && susanData.groups) {
        const allItems = susanData.groups.map((g: any) => ({
          todos: g.counts?.todos || 0,
          bugs: g.counts?.bugs || 0,
          knowledge: (g.counts?.knowledge || 0) + (g.counts?.docs || 0) + (g.counts?.snippets || 0),
          structure: g.counts?.conventions || 0,
          total: g.counts?.total || 0,
        }));
        const totals = allItems.reduce((acc: any, p: any) => ({
          todos: acc.todos + p.todos,
          bugs: acc.bugs + p.bugs,
          knowledge: acc.knowledge + p.knowledge,
          structure: acc.structure + p.structure,
          total: acc.total + p.total,
        }), { todos: 0, bugs: 0, knowledge: 0, structure: 0, total: 0 });
        setSusanTotals(totals);
      }

      // Susan hierarchy from by-parent (real recursive rollups)
      if (projectsListData.success && projectsListData.projects) {
        const parents = projectsListData.projects.filter((p: any) => p.is_parent);
        
        const rollups = await Promise.all(
          parents.map(async (p: any) => {
            try {
              const res = await fetch(`/session-logs/api/extractions/by-parent?parent_id=${p.id}`, { cache: 'no-store' });
              if (!res.ok) return null;
              const r = await res.json();
              if (!r.ok) return null;
              
              return {
                id: p.id,
                name: p.name,
                todos: r.totals?.todos || 0,
                bugs: r.totals?.bugs || 0,
                knowledge: r.totals?.knowledge || 0,
                structure: r.totals?.conventions || 0,
                total: r.totals?.total || 0,
                isParent: true,
                children: (r.children || []).map((c: any) => ({
                  id: c.project_id,
                  name: c.name,
                  todos: c.counts?.todos || 0,
                  bugs: c.counts?.bugs || 0,
                  knowledge: c.counts?.knowledge || 0,
                  structure: c.counts?.conventions || 0,
                  total: c.counts?.total || 0,
                })),
              };
            } catch {
              return null;
            }
          })
        );

        const validRollups = rollups.filter((r): r is SusanProject => r !== null);
        validRollups.sort((a, b) => a.name.localeCompare(b.name));
        setSusanProjects(validRollups);
      }

      if (clairData.success) {
        setClairProjects(clairData.projects || []);
        setClairTotals(clairData.totals || { todos: 0, bugs: 0, knowledge: 0, structure: 0, total: 0 });
      }
      // Build parent projects with aggregated children stats
      if (projectsListData.success && projectsListData.projects) {
        const allProjects = projectsListData.projects;
        const summaries = projectsSummaryData.success ? projectsSummaryData.summaries || {} : {};

        // Create a map of all projects with their stats
        const projectMap: Record<string, Project> = {};
        for (const p of allProjects) {
          const summary = summaries[p.id] || {};
          projectMap[p.id] = {
            id: p.id,
            name: p.name,
            slug: p.slug,
            server_path: p.server_path,
            parent_id: p.parent_id || null,
            todos: summary.pending_todos || summary.todos || 0,
            knowledge: summary.pending_knowledge || summary.knowledge || 0,
            bugs: summary.pending_bugs || summary.bugs || 0,
            children: [],
          };
        }

        // Group children under parents and aggregate stats
        const parentProjects: Project[] = [];

        for (const p of allProjects) {
          const project = projectMap[p.id];

          if (!project.parent_id) {
            // This is a parent project - find all children and aggregate
            const children: Project[] = [];
            let totalTodos = project.todos;
            let totalKnowledge = project.knowledge;
            let totalBugs = project.bugs;

            for (const child of allProjects) {
              if (child.parent_id === p.id) {
                const childProject = projectMap[child.id];
                children.push(childProject);
                totalTodos += childProject.todos;
                totalKnowledge += childProject.knowledge;
                totalBugs += childProject.bugs;
              }
            }

            parentProjects.push({
              ...project,
              todos: totalTodos,
              knowledge: totalKnowledge,
              bugs: totalBugs,
              children: children.sort((a, b) => a.name.localeCompare(b.name)),
            });
          }
        }

        // Sort parents alphabetically
        parentProjects.sort((a, b) => a.name.localeCompare(b.name));
        setProjects(parentProjects);
      }

      // Fetch each team's 5-stage stats
      const teamPromises = TEAMS.map(async (team) => {
        try {
          const res = await fetch(`/session-logs/api/sessions/buckets?workspace=${team.workspace}`, { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            const s = data.stats || {};
            return {
              id: team.id,
              status: {
                active: Number(s.active || 0),
                processed: Number(s.processed || 0),
                extracted: Number(s.extracted || 0),
                cleaned: Number(s.cleaned || 0),
                archived: Number(s.archived || 0),
              }
            };
          }
        } catch {}
        return { id: team.id, status: { active: 0, processed: 0, extracted: 0, cleaned: 0, archived: 0 } };
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

  // Load saved project order from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('session-logs-project-order');
    if (saved) {
      try {
        setProjectOrder(JSON.parse(saved));
      } catch {}
    }
  }, []);

  // Save project order to localStorage when it changes
  useEffect(() => {
    if (projectOrder.length > 0) {
      localStorage.setItem('session-logs-project-order', JSON.stringify(projectOrder));
    }
  }, [projectOrder]);

  // Drag handlers for project reordering
  const handleDragStart = (projectId: string) => {
    setDraggedProject(projectId);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedProject || draggedProject === targetId) return;

    // Get all project IDs (combine susan and clair, dedupe)
    const allIds = [...new Set([...susanProjects.map(p => p.id), ...clairProjects.map(p => p.id)])];

    // Use current order or default order
    const currentOrder = projectOrder.length > 0 ? projectOrder : allIds;

    const dragIdx = currentOrder.indexOf(draggedProject);
    const targetIdx = currentOrder.indexOf(targetId);

    if (dragIdx === -1 || targetIdx === -1) return;

    // Reorder
    const newOrder = [...currentOrder];
    newOrder.splice(dragIdx, 1);
    newOrder.splice(targetIdx, 0, draggedProject);
    setProjectOrder(newOrder);
  };

  const handleDragEnd = () => {
    setDraggedProject(null);
  };

  // Sort projects by custom order
  const sortByOrder = <T extends { id: string }>(items: T[]): T[] => {
    if (projectOrder.length === 0) return items;
    return [...items].sort((a, b) => {
      const aIdx = projectOrder.indexOf(a.id);
      const bIdx = projectOrder.indexOf(b.id);
      if (aIdx === -1 && bIdx === -1) return 0;
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });
  };

  // Initial load
  useEffect(() => {
    refreshAll();
  }, []);

  // Auto-refresh every 5 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(refreshAll, 5000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  // 5-stage session lifecycle: active → processed → extracted → cleaned → archived
  const sessionTotals = {
    active: Number(stats?.active || buckets['active'] || 0),
    processed: Number(stats?.processed || buckets['processed'] || 0),
    extracted: Number(stats?.extracted || buckets['extracted'] || 0),
    cleaned: Number(stats?.cleaned || buckets['cleaned'] || 0),
    archived: Number(stats?.archived || buckets['archived'] || 0),
    total: Number(stats?.total_sessions || 0),
    last24h: Number(stats?.last_24h || 0),
  };

  // Item counts (pending review by Susan, published by Clair)
  const itemCounts = {
    pending: Number(stats?.pending || buckets['pending'] || 0),
    published: Number(buckets['published'] || 0),
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

      {/* Team Summary Cards - 5-stage flow */}
      <div className="p-4 bg-gray-850 border-b border-gray-700 shrink-0">
        <div className="grid grid-cols-4 gap-4">
          {TEAMS.map(team => {
            const status = teamStatuses[team.id] || { active: 0, processed: 0, extracted: 0, cleaned: 0, archived: 0 };
            return (
              <div key={team.id} className="p-3 rounded-lg border border-gray-700 bg-gray-800/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-white">{team.name}</span>
                </div>
                <div className="grid grid-cols-5 gap-1 text-center">
                  <div>
                    <div className="text-sm font-bold text-cyan-400">{status.active}</div>
                    <div className="text-[9px] text-gray-500">Active</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-blue-400">{status.processed}</div>
                    <div className="text-[9px] text-gray-500">Proc</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-purple-400">{status.extracted}</div>
                    <div className="text-[9px] text-gray-500">Extr</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-teal-400">{status.cleaned}</div>
                    <div className="text-[9px] text-gray-500">Clean</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-green-400">{status.archived}</div>
                    <div className="text-[9px] text-gray-500">Arch</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5-Stage Session Pipeline: active → processed → extracted → cleaned → archived */}
      <div className="border-b border-gray-700 shrink-0 px-4 py-3 bg-gray-800/50">
        <div className="flex items-center justify-around">
          <SessionStage label="Active" value={sessionTotals.active} color="cyan" owner="Chad" />
          <PipelineArrow />
          <SessionStage label="Processed" value={sessionTotals.processed} color="blue" owner="Jen" />
          <PipelineArrow />
          <SessionStage label="Cleaned" value={sessionTotals.cleaned} color="teal" owner="Susan" />
          <PipelineArrow />
          <SessionStage label="Extracted" value={sessionTotals.extracted} color="purple" owner="Claude" />
          <PipelineArrow />
          <SessionStage label="Archived" value={sessionTotals.archived} color="green" owner="Susan" />
        </div>
        <div className="text-center mt-2 text-xs text-gray-500">
          {sessionTotals.total} total sessions | {sessionTotals.last24h} in last 24h
        </div>
      </div>

      {/* Main Content - 3 equal columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* Column 1: Chad's Session Logs */}
        <div className="flex-1 flex flex-col border-r border-gray-700 min-w-0">
          <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700 shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-gray-300">Chad's Sessions ({sessions.length})</h2>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${externalClaudeHealth === 'healthy' ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}
                  title={externalClaudeHealth === 'healthy' ? 'Chad: Capturing every 15 min' : 'Chad: MISSED 15-min capture!'}
                />
                <span className="text-xs text-gray-500">Chad</span>
              </div>
            </div>
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

        {/* Column 2: Jen's 20 Extraction Buckets */}
        <div className="flex-1 flex flex-col border-r border-gray-700 min-w-0">
          <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700 shrink-0">
            <h2 className="text-sm font-medium text-gray-300">Jen's Extractions</h2>
          </div>
          <div className="flex-1 overflow-auto p-3">
            <div className="space-y-1">
              {JEN_BUCKETS.map(name => (
                <BucketRow key={name} name={name} count={jenBuckets[name] || 0} />
              ))}
            </div>
          </div>
        </div>

        {/* Column 3: Susan's Project Breakdown */}
        <div className="flex-1 flex flex-col border-r border-gray-700 min-w-0">
          <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700 shrink-0">
            <h2 className="text-sm font-medium text-gray-300">Susan's Filing ({susanTotals.total})</h2>
            <div className="flex gap-3 mt-1 text-[10px]">
              <span className="text-blue-400">Todos {susanTotals.todos}</span>
              <span className="text-red-400">Bugs {susanTotals.bugs}</span>
              <span className="text-green-400">Knowledge {susanTotals.knowledge}</span>
              <span className="text-purple-400">Structure {susanTotals.structure}</span>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-2">
            <div className="space-y-1">
              {susanProjects.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-xs">No items filed</div>
              ) : (
                sortByOrder(susanProjects).map(project => (
                  <SusanProjectRow
                    isExpanded={expandedParents.has(project.id)}
                    onToggleExpand={() => setExpandedParents(prev => {
                      const next = new Set(prev);
                      if (next.has(project.id)) next.delete(project.id);
                      else next.add(project.id);
                      return next;
                    })}
                    key={project.id}
                    project={project}
                    isDragging={draggedProject === project.id}
                    onDragStart={() => handleDragStart(project.id)}
                    onDragOver={(e) => handleDragOver(e, project.id)}
                    onDragEnd={handleDragEnd}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Column 4: Clair's Published */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700 shrink-0">
            <h2 className="text-sm font-medium text-gray-300">Clair's Published ({clairTotals.total})</h2>
            <div className="flex gap-3 mt-1 text-[10px]">
              <span className="text-blue-400">Todos {clairTotals.todos}</span>
              <span className="text-red-400">Bugs {clairTotals.bugs}</span>
              <span className="text-green-400">Knowledge {clairTotals.knowledge}</span>
              <span className="text-purple-400">Structure {clairTotals.structure}</span>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-2">
            <div className="space-y-1">
              {clairProjects.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-xs">No items published</div>
              ) : (
                sortByOrder(clairProjects).map(project => (
                  <ClairProjectRow
                    key={project.id}
                    project={project}
                    isDragging={draggedProject === project.id}
                    onDragStart={() => handleDragStart(project.id)}
                    onDragOver={(e) => handleDragOver(e, project.id)}
                    onDragEnd={handleDragEnd}
                  />
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

// Session stage display with owner label
function SessionStage({ label, value, color, owner }: { label: string; value: number; color: string; owner: string }) {
  const colors: Record<string, string> = {
    cyan: 'text-cyan-400',
    blue: 'text-blue-400',
    indigo: 'text-indigo-400',
    purple: 'text-purple-400',
    yellow: 'text-yellow-400',
    teal: 'text-teal-400',
    green: 'text-green-400',
  };

  const bgColors: Record<string, string> = {
    cyan: 'bg-cyan-900/30',
    blue: 'bg-blue-900/30',
    purple: 'bg-purple-900/30',
    teal: 'bg-teal-900/30',
    green: 'bg-green-900/30',
  };

  return (
    <div className={`text-center px-4 py-2 rounded-lg ${bgColors[color] || ''}`}>
      <div className={`text-2xl font-bold ${colors[color] || 'text-gray-400'}`}>{value}</div>
      <div className="text-xs text-white font-medium">{label}</div>
      <div className="text-[10px] text-gray-500">{owner}</div>
    </div>
  );
}

// Map raw source_name to human-readable display label
function displaySourceName(source: string | undefined): string {
  if (!source) return "Unknown";

  // External Claude / Desktop captured jsonl
  if (source.startsWith("C--Users-") && source.endsWith(".jsonl")) return "External Claude (Desktop)";
  if (source.startsWith("C--Users-")) return "External Claude (Desktop)";

  // Internal terminal streams
  if (source.startsWith("terminal-5400/") || source === "terminal/5400") return "Internal Claude Terminal (5400)";
  if (source.startsWith("terminal-")) {
    const match = source.match(/terminal-(d+)/);
    if (match) return `Internal Terminal (${match[1]})`;
    return "Internal Terminal";
  }

  // System logs
  if (source === "mcp-session-log") return "MCP Session Log";

  return source; // fallback to raw
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
      return displaySourceName(session.source_name);
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

  // 5-stage session lifecycle: active → processed → extracted → cleaned → archived
  const statusColors: Record<string, string> = {
    active: 'bg-cyan-900/50 text-cyan-400',
    processed: 'bg-blue-900/50 text-blue-400',
    extracted: 'bg-purple-900/50 text-purple-400',
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
        <span className="text-xs text-gray-400 truncate">
          {session.project_slug
            ? `${(session.user_name || 'MICHAEL').toUpperCase()} - ${session.project_slug.toUpperCase()}`
            : session.mode
              ? `${(session.user_name || 'MICHAEL').toUpperCase()} - ${session.mode.toUpperCase()}`
              : session.project_path || displaySourceName(session.source_name)}
        </span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusColors[session.status || 'captured'] || statusColors.captured}`}>
          {session.status || 'captured'}
        </span>
      </div>
    </div>
  );
}

// Susan's project row - shows Todos/Bugs/Knowledge/Structure under name (draggable)
function SusanProjectRow({
  project,
  isDragging,
  onDragStart,
  onDragOver,
  onDragEnd,
  isExpanded,
  onToggleExpand,
}: {
  project: SusanProject;
  isDragging: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}) {
  const hasChildren = project.children && project.children.length > 0;
  
  return (
    <div>
      <div
        draggable
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        className={`py-1.5 px-2 rounded bg-gray-800/30 text-xs cursor-grab active:cursor-grabbing ${
          isDragging ? 'opacity-50 border border-blue-500' : ''
        }`}
      >
        <div className="flex items-center gap-1">
          {hasChildren && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleExpand?.(); }}
              className="text-gray-400 hover:text-white p-0.5"
            >
              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
          )}
          <span className={`font-medium truncate flex-1 ${project.total > 0 ? 'text-white' : 'text-gray-500'}`}>
            {project.name}
            {hasChildren && <span className="text-gray-500 ml-1">({project.children!.length})</span>}
          </span>
        </div>
        <div className={`flex gap-2 mt-0.5 text-[10px] ${hasChildren ? 'ml-4' : ''}`}>
          <span className={project.todos > 0 ? 'text-blue-400' : 'text-gray-600'}>Todos {project.todos}</span>
          <span className={project.bugs > 0 ? 'text-red-400' : 'text-gray-600'}>Bugs {project.bugs}</span>
          <span className={project.knowledge > 0 ? 'text-green-400' : 'text-gray-600'}>Knowledge {project.knowledge}</span>
          <span className={project.structure > 0 ? 'text-purple-400' : 'text-gray-600'}>Structure {project.structure}</span>
        </div>
      </div>
      {hasChildren && isExpanded && (
        <div className="ml-4 mt-1 space-y-1 border-l border-gray-700 pl-2">
          {project.children!.map(child => (
            <div key={child.id} className="py-1 px-2 rounded bg-gray-800/20 text-xs">
              <div className={`font-medium truncate ${child.total > 0 ? 'text-gray-300' : 'text-gray-600'}`}>
                {child.name}
              </div>
              <div className="flex gap-2 mt-0.5 text-[10px]">
                <span className={child.todos > 0 ? 'text-blue-400' : 'text-gray-700'}>T {child.todos}</span>
                <span className={child.bugs > 0 ? 'text-red-400' : 'text-gray-700'}>B {child.bugs}</span>
                <span className={child.knowledge > 0 ? 'text-green-400' : 'text-gray-700'}>K {child.knowledge}</span>
                <span className={child.structure > 0 ? 'text-purple-400' : 'text-gray-700'}>S {child.structure}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Clair's project row - shows Todos/Bugs/Knowledge/Structure under name (draggable)
function ClairProjectRow({
  project,
  isDragging,
  onDragStart,
  onDragOver,
  onDragEnd,
}: {
  project: ClairProject;
  isDragging: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={`py-1.5 px-2 rounded bg-gray-800/30 text-xs cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-50 border border-blue-500' : ''
      }`}
    >
      <div className={`font-medium truncate ${project.total > 0 ? 'text-white' : 'text-gray-500'}`}>
        {project.name}
      </div>
      <div className="flex gap-2 mt-0.5 text-[10px]">
        <span className={project.todos > 0 ? 'text-blue-400' : 'text-gray-600'}>Todos {project.todos}</span>
        <span className={project.bugs > 0 ? 'text-red-400' : 'text-gray-600'}>Bugs {project.bugs}</span>
        <span className={project.knowledge > 0 ? 'text-green-400' : 'text-gray-600'}>Knowledge {project.knowledge}</span>
        <span className={project.structure > 0 ? 'text-purple-400' : 'text-gray-600'}>Structure {project.structure}</span>
      </div>
    </div>
  );
}

// Bucket row for extraction categories
function BucketRow({ name, count }: { name: string; count: number }) {
  const bucketColors: Record<string, string> = {
    active: 'bg-cyan-900/20',
    processed: 'bg-blue-900/20',
    extracted: 'bg-purple-900/20',
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

// Project card for Susan's column - clickable to project management page
function ProjectCard({ project }: { project: Project }) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = project.children && project.children.length > 0;
  const total = project.todos + project.knowledge + project.bugs;

  return (
    <div className="rounded border border-gray-700 bg-gray-800/50 overflow-hidden">
      <div
        className="p-2 flex items-center gap-2 hover:bg-gray-700/50 cursor-pointer"
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
          )
        ) : (
          <div className="w-4 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <Link
              href={`/project-management?project=${project.slug}&allClients=true`}
              className="font-medium text-white text-sm truncate hover:text-blue-400"
              onClick={(e) => e.stopPropagation()}
            >
              {project.name}
            </Link>
            {total > 0 && (
              <span className="text-xs text-gray-400 ml-2 shrink-0">{total}</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs">
            <span className={project.todos > 0 ? 'text-blue-400' : 'text-gray-600'}>
              To-do: {project.todos}
            </span>
            <span className={project.knowledge > 0 ? 'text-green-400' : 'text-gray-600'}>
              Knowledge: {project.knowledge}
            </span>
            <span className={project.bugs > 0 ? 'text-red-400' : 'text-gray-600'}>
              Bugs: {project.bugs}
            </span>
            {hasChildren && (
              <span className="text-gray-500">
                ({project.children!.length} projects)
              </span>
            )}
          </div>
        </div>
      </div>

      {expanded && hasChildren && (
        <div className="border-t border-gray-700 bg-gray-900/50">
          {project.children!.map(child => {
            const childTotal = child.todos + child.knowledge + child.bugs;
            return (
              <Link
                key={child.id}
                href={`/project-management?project=${child.slug}&allClients=true`}
                className="block p-2 pl-8 hover:bg-gray-700/30 border-b border-gray-700/50 last:border-b-0"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300 truncate">{child.name}</span>
                  {childTotal > 0 && (
                    <span className="text-xs text-gray-500 ml-2">{childTotal}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-[11px]">
                  <span className={child.todos > 0 ? 'text-blue-400/80' : 'text-gray-600'}>
                    {child.todos}
                  </span>
                  <span className={child.knowledge > 0 ? 'text-green-400/80' : 'text-gray-600'}>
                    {child.knowledge}
                  </span>
                  <span className={child.bugs > 0 ? 'text-red-400/80' : 'text-gray-600'}>
                    {child.bugs}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
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
