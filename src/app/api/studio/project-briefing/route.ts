/**
 * Project Briefing Generator API
 * Generates server-side briefing packets without relying on Claude/MCP calls
 *
 * POST /api/studio/project-briefing
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface BriefingRequest {
  projectId: string;
  teamId: string;
  basePort: number;
  devSlot: string;
  pcTag: string;
  userName: string;
}

interface ProjectData {
  id: string;
  name: string;
  slug: string;
  server_path: string | null;
  local_path: string | null;
  description: string | null;
  parent_id: string | null;
  is_parent: boolean;
}

interface SessionData {
  id: string;
  summary: string | null;
  started_at: string;
  ended_at: string | null;
  status: string;
}

interface TodoData {
  id: string;
  content: string;
  priority: string | null;
  created_at: string;
}

interface BugData {
  id: string;
  title: string;
  severity: string | null;
  created_at: string;
}

interface ChildProject {
  id: string;
  name: string;
  slug: string;
}

/**
 * Generate the project briefing packet
 */
async function generateBriefingPacket(params: BriefingRequest): Promise<{
  briefingPacket: string;
  chatgptSyncPayload: string;
  rawData: Record<string, unknown>;
}> {
  const { projectId, teamId, basePort, devSlot, pcTag, userName } = params;
  const timestamp = new Date().toISOString();

  // 1. Get project metadata
  let project: ProjectData | null = null;
  try {
    const result = await db.from<ProjectData>('dev_projects')
      .select('id, name, slug, server_path, local_path, description, parent_id, is_parent')
      .eq('id', projectId)
      .single();
    project = result.data as ProjectData | null;
  } catch (e) {
    console.error('[ProjectBriefing] Error fetching project:', e);
  }

  // 2. Get child projects (if this is a parent)
  let childProjects: ChildProject[] = [];
  try {
    const result = await db.from<ChildProject>('dev_projects')
      .select('id, name, slug')
      .eq('parent_id', projectId)
      .eq('is_active', true);
    childProjects = (result.data as ChildProject[]) || [];
  } catch (e) {
    console.error('[ProjectBriefing] Error fetching child projects:', e);
  }

  // 3. Get recent work sessions (last 12 hours or last 5)
  let recentSessions: SessionData[] = [];
  try {
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    const result = await db.from<SessionData>('dev_ai_sessions')
      .select('id, summary, started_at, ended_at, status')
      .eq('project_id', projectId)
      .gte('started_at', twelveHoursAgo)
      .order('started_at', { ascending: false })
      .limit(5);
    recentSessions = (result.data as SessionData[]) || [];
  } catch (e) {
    console.error('[ProjectBriefing] Error fetching sessions:', e);
  }

  // 4. Get unassigned todos from smart_extractions (top 10)
  let openTodos: TodoData[] = [];
  let todoCount = 0;
  try {
    const countResult = await db.query<{ count: string }>(
      "SELECT COUNT(*) as count FROM dev_ai_smart_extractions WHERE project_id = $1 AND bucket = 'Todos' AND status = 'unassigned'",
      [projectId]
    );
    todoCount = parseInt((countResult.data as { count: string }[])?.[0]?.count || '0', 10);

    const result = await db.query<TodoData>(
      `SELECT id, content, priority, created_at
       FROM dev_ai_smart_extractions
       WHERE project_id = $1 AND bucket = 'Todos' AND status = 'unassigned'
       ORDER BY created_at DESC LIMIT 10`,
      [projectId]
    );
    openTodos = (result.data as TodoData[]) || [];
  } catch (e) {
    console.error('[ProjectBriefing] Error fetching todos:', e);
  }

  // 5. Get open bugs from smart_extractions (top 10)
  let openBugs: BugData[] = [];
  let bugCount = 0;
  try {
    const countResult = await db.query<{ count: string }>(
      "SELECT COUNT(*) as count FROM dev_ai_smart_extractions WHERE project_id = $1 AND bucket = 'Bugs Open' AND status = 'open'",
      [projectId]
    );
    bugCount = parseInt((countResult.data as { count: string }[])?.[0]?.count || '0', 10);

    const result = await db.query<BugData>(
      `SELECT id, title, priority as severity, created_at
       FROM dev_ai_smart_extractions
       WHERE project_id = $1 AND bucket = 'Bugs Open' AND status = 'open'
       ORDER BY created_at DESC LIMIT 10`,
      [projectId]
    );
    openBugs = (result.data as BugData[]) || [];
  } catch (e) {
    console.error('[ProjectBriefing] Error fetching bugs:', e);
  }

  // 6. Get recent work logs from smart_extractions
  let workLogs: { content: string; created_at: string }[] = [];
  try {
    const result = await db.query<{ content: string; created_at: string }>(
      `SELECT content, created_at
       FROM dev_ai_smart_extractions
       WHERE project_id = $1 AND bucket = 'Work Log'
       ORDER BY created_at DESC LIMIT 3`,
      [projectId]
    );
    workLogs = (result.data as { content: string; created_at: string }[]) || [];
  } catch (e) {
    console.error('[ProjectBriefing] Error fetching work logs:', e);
  }

  // Build the briefing packet text
  const briefingLines: string[] = [];

  briefingLines.push('=== PROJECT BRIEFING PACKET ===');
  briefingLines.push(`Generated: ${timestamp}`);
  briefingLines.push('');

  // 1) Project Snapshot
  briefingLines.push('1) Project Snapshot');
  if (project) {
    briefingLines.push(`- Name: ${project.name}`);
    briefingLines.push(`- Slug: ${project.slug}`);
    briefingLines.push(`- Purpose: ${project.description || '(No description)'}`);
    briefingLines.push(`- Server Path: ${project.server_path || '(Not set)'}`);
    briefingLines.push(`- Local Path: ${project.local_path || '(Not set)'}`);
  } else {
    briefingLines.push('- (Project not found in database)');
  }
  briefingLines.push(`- Dev Team: ${teamId}`);
  briefingLines.push(`- Base Port: ${basePort}`);
  briefingLines.push(`- Dev Slot: ${devSlot}`);
  if (childProjects.length > 0) {
    briefingLines.push(`- Child Projects: ${childProjects.map(c => c.name).join(', ')}`);
  }
  briefingLines.push('');

  // 2) Current Phase + Next Objectives
  briefingLines.push('2) Current Phase + Next 3 Objectives');
  briefingLines.push('- Current Phase: (No phase tracking yet)');
  briefingLines.push('- Next Objectives: (Infer from recent work or set manually)');
  briefingLines.push('');

  // 3) Database Context
  briefingLines.push('3) Database Context');
  briefingLines.push('- Tables: (Use Jen schema captures for details)');
  briefingLines.push('- Key Relations: (Project-specific)');
  briefingLines.push('- Known Gotchas: (None tracked yet)');
  briefingLines.push('');

  // 4) Structure
  briefingLines.push('4) Structure');
  briefingLines.push('- File/Folder Tree: (Use Jen structure tab for details)');
  briefingLines.push(`- Key Entrypoints: ${project?.server_path || '/var/www/Studio'}`);
  briefingLines.push('');

  // 5) Last Work Context
  briefingLines.push('5) Last Work Context (Last 12 hours)');
  if (workLogs.length > 0) {
    for (const log of workLogs) {
      const time = new Date(log.created_at).toLocaleString();
      briefingLines.push(`- [${time}] ${log.content}`);
    }
  } else if (recentSessions.length > 0) {
    // Fallback to sessions if no work logs
    for (const session of recentSessions) {
      const time = new Date(session.started_at).toLocaleString();
      briefingLines.push(`- [${time}] ${session.summary || '(No summary)'} (${session.status})`);
    }
  } else {
    briefingLines.push('- (No recent work logs or sessions)');
  }
  briefingLines.push('');

  // 6) Open Items
  briefingLines.push('6) Open Items');
  briefingLines.push(`- Bugs Open: ${bugCount} total`);
  if (openBugs.length > 0) {
    for (const bug of openBugs.slice(0, 10)) {
      briefingLines.push(`  - [${bug.severity || 'unknown'}] ${bug.title}`);
    }
  } else {
    briefingLines.push('  (None)');
  }
  briefingLines.push(`- Todos Unassigned: ${todoCount} total`);
  if (openTodos.length > 0) {
    for (const todo of openTodos.slice(0, 10)) {
      briefingLines.push(`  - [${todo.priority || 'normal'}] ${todo.content}`);
    }
  } else {
    briefingLines.push('  (None)');
  }

  const briefingPacket = briefingLines.join('\n');

  // Build ChatGPT Sync Payload
  const syncLines: string[] = [];
  syncLines.push('=== CHATGPT SYNC PAYLOAD ===');
  syncLines.push('');
  syncLines.push('META');
  syncLines.push(`- project_name: ${project?.name || '(Unknown)'}`);
  syncLines.push(`- project_id: ${projectId}`);
  syncLines.push(`- project_slug: ${project?.slug || '(none)'}`);
  syncLines.push(`- dev_team: ${teamId}`);
  syncLines.push(`- dev_slot: ${devSlot}`);
  syncLines.push(`- base_port: ${basePort}`);
  syncLines.push(`- pc_tag: ${pcTag}`);
  syncLines.push(`- user: ${userName}`);
  syncLines.push(`- generated_at: ${timestamp}`);
  syncLines.push('');
  syncLines.push('SOURCES USED');
  syncLines.push(`- server_path: ${project?.server_path || '(not set)'}`);
  syncLines.push(`- local_path: ${project?.local_path || '(not set)'}`);
  syncLines.push(`- db_tables_queried: dev_projects, dev_ai_sessions, dev_ai_smart_extractions`);
  syncLines.push('');
  syncLines.push('STATE SNAPSHOT');
  syncLines.push(`- recent_sessions: ${recentSessions.length}`);
  syncLines.push(`- open_bugs: ${bugCount}`);
  syncLines.push(`- unassigned_todos: ${todoCount}`);
  syncLines.push(`- child_projects: ${childProjects.length}`);
  syncLines.push('');
  syncLines.push('TOP 5 LOAD-BEARING FACTS');
  syncLines.push(`1. Project "${project?.name || 'Unknown'}" running on port ${basePort} — source: dev_projects`);
  syncLines.push(`2. ${recentSessions.length} work sessions in last 12 hours — source: dev_ai_sessions`);
  syncLines.push(`3. ${bugCount} open bugs to address — source: dev_ai_smart_extractions`);
  syncLines.push(`4. ${todoCount} unassigned todos — source: dev_ai_smart_extractions`);
  syncLines.push(`5. Server path: ${project?.server_path || '(not configured)'} — source: dev_projects`);
  syncLines.push('');

  // Simple checksum (first 8 chars of hex)
  const checksumInput = syncLines.join('');
  let hash = 0;
  for (let i = 0; i < checksumInput.length; i++) {
    const char = checksumInput.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const checksum = Math.abs(hash).toString(16).padStart(8, '0').slice(0, 8);
  syncLines.push(`CHECKSUM: ${checksum}`);

  const chatgptSyncPayload = syncLines.join('\n');

  return {
    briefingPacket,
    chatgptSyncPayload,
    rawData: {
      project,
      childProjects,
      recentSessions,
      workLogs,
      openTodos,
      openBugs,
      counts: { todoCount, bugCount },
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as BriefingRequest;

    if (!body.projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    const result = await generateBriefingPacket(body);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[ProjectBriefing] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate briefing' },
      { status: 500 }
    );
  }
}

// Also support GET for simple testing
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json(
      { success: false, error: 'projectId query param required' },
      { status: 400 }
    );
  }

  const result = await generateBriefingPacket({
    projectId,
    teamId: url.searchParams.get('teamId') || 'dev1',
    basePort: parseInt(url.searchParams.get('basePort') || '5410', 10),
    devSlot: url.searchParams.get('devSlot') || '1',
    pcTag: url.searchParams.get('pcTag') || 'unknown',
    userName: url.searchParams.get('userName') || 'Unknown',
  });

  return NextResponse.json({
    success: true,
    ...result,
  });
}
