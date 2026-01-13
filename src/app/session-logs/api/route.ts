import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /session-logs/api - Worklog Library (Susan's 3-hour blocks)
 * Reads from dev_worklog_blocks (Susan's output table)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode'); // lane: worklog/forge/planning
    const projectSlug = searchParams.get('project');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build base query from Susan's worklog blocks table
    let query = db.from('dev_worklog_blocks')
      .select('id, ts_id, user_id, pc_tag, mode, lane, project_id, project_slug, window_start, window_end, session_ids, message_count, cleaned_at, clean_version, created_at');

    // Filter by lane (worklog/forge/planning) - this is what UI calls "mode"
    if (mode) query = query.eq('lane', mode);
    if (projectSlug) query = query.eq('project_slug', projectSlug);

    // Execute with order and limit - most recent first
    const { data, error } = await query
      .order('window_end', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Worklog blocks API error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data || []) as Record<string, unknown>[];

    // Get project info for each worklog block
    const worklogs = await Promise.all(rows.map(async (block) => {
      let projectName = null;

      if (block.project_id) {
        const { data: project } = await db.from('dev_projects')
          .select('slug, name')
          .eq('id', block.project_id as string)
          .single();
        if (project) {
          const p = project as unknown as { slug: string; name: string };
          projectName = p.name;
        }
      }

      // Calculate duration from window times (3-hour blocks)
      const windowStart = block.window_start ? new Date(block.window_start as string) : null;
      const windowEnd = block.window_end ? new Date(block.window_end as string) : null;
      const durationHours = windowStart && windowEnd
        ? (windowEnd.getTime() - windowStart.getTime()) / (1000 * 60 * 60)
        : 3; // Default 3 hours

      // Use the real ts_id from the database (TS101529, TS101530, etc.)
      const blockId = block.id as string;
      const tsId = block.ts_id as string || `TS${blockId.slice(0, 6)}`;

      // Session count from session_ids array
      const sessionIds = block.session_ids as string[] | null;
      const sessionCount = sessionIds?.length || 0;

      return {
        ts_id: tsId,
        block_id: blockId,
        mode: block.lane || block.mode, // lane is worklog/forge/planning
        source_type: block.mode, // mode is internal/external
        briefing: `${sessionCount} session${sessionCount !== 1 ? 's' : ''} from ${block.pc_tag || 'unknown source'}`,
        segment_start: block.window_start,
        segment_end: block.window_end,
        window_start: block.window_start,
        window_end: block.window_end,
        duration_hours: durationHours,
        status: block.cleaned_at ? 'cleaned' : 'pending',
        created_at: block.created_at,
        cleaned_at: block.cleaned_at,
        project_slug: block.project_slug,
        project_name: projectName,
        session_count: sessionCount,
        message_count: block.message_count
      };
    }));

    return NextResponse.json({
      success: true,
      worklogs,
      pagination: {
        total: worklogs.length,
        limit,
        hasMore: worklogs.length >= limit
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Worklog blocks API error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
