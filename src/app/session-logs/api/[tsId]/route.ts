import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface WorklogBlock {
  id: string;
  user_id: string;
  pc_tag: string;
  mode: string; // internal/external
  lane: string; // worklog/forge/planning
  project_id: string | null;
  project_slug: string | null;
  window_start: string;
  window_end: string;
  session_ids: string[] | null;
  message_count: number;
  raw_text: string | null;
  clean_text_worklog: string | null;
  cleaned_at: string | null;
  clean_version: number;
  created_at: string;
}

/**
 * GET /session-logs/api/[tsId] - Get single worklog block by ID
 * tsId can be:
 *   - WB-xxxxxxxx (generated ts_id from list API)
 *   - full UUID (direct block_id)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tsId: string }> }
) {
  try {
    const { tsId } = await params;

    // Handle TS-prefixed IDs (TS101529, etc.) or direct UUID lookups
    let data = null;
    let error = null;

    if (tsId.startsWith('TS')) {
      // Look up by ts_id column
      const result = await db.from('dev_worklog_blocks')
        .select('*')
        .eq('ts_id', tsId)
        .single();
      data = result.data;
      error = result.error;
    } else {
      // Direct UUID lookup
      const result = await db.from('dev_worklog_blocks')
        .select('*')
        .eq('id', tsId)
        .single();
      data = result.data;
      error = result.error;
    }

    if (error || !data) {
      return NextResponse.json({
        success: false,
        error: 'Worklog block not found'
      }, { status: 404 });
    }

    const block = data as unknown as WorklogBlock;

    // Get project info
    let projectName = null;
    if (block.project_id) {
      const { data: project } = await db.from('dev_projects')
        .select('slug, name')
        .eq('id', block.project_id)
        .single();
      if (project) {
        const proj = project as { slug: string; name: string };
        projectName = proj.name;
      }
    }

    // Get associated session logs
    const sessionIds = block.session_ids || [];
    let sessions: Array<{ id: string; segment_start: string; segment_end: string; message_count: number; status: string }> = [];

    if (sessionIds.length > 0) {
      const { data: sessionData } = await db.from('dev_session_logs')
        .select('id, segment_start, segment_end, message_count, status')
        .in('id', sessionIds)
        .order('segment_start', { ascending: true });

      sessions = (sessionData || []) as typeof sessions;
    }

    // Calculate duration from window times
    const windowStart = new Date(block.window_start);
    const windowEnd = new Date(block.window_end);
    const durationHours = (windowEnd.getTime() - windowStart.getTime()) / (1000 * 60 * 60);

    // Use real ts_id from database
    const blockTsId = (block as unknown as { ts_id?: string }).ts_id || `TS${block.id.slice(0, 6)}`;

    return NextResponse.json({
      success: true,
      worklog: {
        ts_id: blockTsId,
        block_id: block.id,
        mode: block.lane || block.mode, // lane is worklog/forge/planning (what UI calls "mode")
        source_type: block.mode, // mode is internal/external
        title: `${block.lane || 'Worklog'} - ${block.pc_tag}`,
        briefing: `${sessionIds.length} session${sessionIds.length !== 1 ? 's' : ''} aggregated from ${block.pc_tag}`,
        clean_text: block.clean_text_worklog, // Susan's cleaned transcript
        raw_text: block.raw_text, // Raw content if needed
        segment_start: block.window_start,
        segment_end: block.window_end,
        window_start: block.window_start,
        window_end: block.window_end,
        duration_hours: durationHours,
        status: block.cleaned_at ? 'cleaned' : 'pending',
        cleaned_at: block.cleaned_at,
        clean_version: block.clean_version,
        created_at: block.created_at,
        project_slug: block.project_slug,
        project_name: projectName,
        session_count: sessionIds.length,
        message_count: block.message_count,
        sessions
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Worklog block detail API error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
