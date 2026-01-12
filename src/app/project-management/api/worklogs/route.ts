import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /project-management/api/worklogs
 * Fetch worklog blocks for a project or multiple projects (for parent rollups)
 *
 * Params:
 * - project_id: single project ID
 * - project_ids: comma-separated list of project IDs (for parent rollups)
 * - project_slug: single project slug
 * - limit: max results (default 20)
 * - include_rollup: if true, include aggregated stats
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const projectIds = searchParams.get('project_ids'); // For parent rollups
    const projectSlug = searchParams.get('project_slug');
    const limit = parseInt(searchParams.get('limit') || '20');
    const includeRollup = searchParams.get('include_rollup') === 'true';

    if (!projectId && !projectIds && !projectSlug) {
      return NextResponse.json({ error: 'project_id, project_ids, or project_slug required' }, { status: 400 });
    }

    // Build query
    let query = db
      .from('dev_worklog_blocks')
      .select(`
        id,
        project_id,
        project_slug,
        lane,
        pc_tag,
        window_start,
        window_end,
        message_count,
        bytes_raw,
        bytes_clean,
        raw_text,
        clean_text_worklog,
        created_at,
        cleaned_at
      `)
      .order('window_start', { ascending: false })
      .limit(limit);

    // Handle multiple project IDs for parent rollups
    if (projectIds) {
      const ids = projectIds.split(',').filter(id => id.trim());
      if (ids.length > 0) {
        query = query.in('project_id', ids);
      }
    } else if (projectId) {
      query = query.eq('project_id', projectId);
    } else if (projectSlug) {
      query = query.eq('project_slug', projectSlug);
    }

    const { data, error } = await query;
    const worklogs = (data || []) as any[];

    if (error) {
      console.error('Error fetching worklogs:', error);
      return NextResponse.json({ error: 'Failed to fetch worklogs' }, { status: 500 });
    }

    // Calculate rollup stats if requested
    let rollup = null;
    if (includeRollup && worklogs.length > 0) {
      rollup = calculateRollupStats(worklogs);
    }

    return NextResponse.json({
      success: true,
      worklogs,
      count: worklogs.length,
      rollup,
    });
  } catch (error) {
    console.error('Error in worklogs GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Calculate aggregated stats for parent project rollups
 */
function calculateRollupStats(worklogs: any[]) {
  const byLane: Record<string, { count: number; messages: number; bytes: number }> = {};
  const byProject: Record<string, { slug: string; count: number; messages: number; lastActivity: string | null }> = {};
  let totalMessages = 0;
  let totalBytes = 0;
  let lastActivity: string | null = null;

  for (const w of worklogs) {
    // By lane
    if (!byLane[w.lane]) {
      byLane[w.lane] = { count: 0, messages: 0, bytes: 0 };
    }
    byLane[w.lane].count++;
    byLane[w.lane].messages += w.message_count || 0;
    byLane[w.lane].bytes += w.bytes_clean || 0;

    // By project
    if (!byProject[w.project_id]) {
      byProject[w.project_id] = { slug: w.project_slug, count: 0, messages: 0, lastActivity: null };
    }
    byProject[w.project_id].count++;
    byProject[w.project_id].messages += w.message_count || 0;
    if (!byProject[w.project_id].lastActivity || w.window_start > byProject[w.project_id].lastActivity) {
      byProject[w.project_id].lastActivity = w.window_start;
    }

    // Totals
    totalMessages += w.message_count || 0;
    totalBytes += w.bytes_clean || 0;
    if (!lastActivity || w.window_start > lastActivity) {
      lastActivity = w.window_start;
    }
  }

  return {
    totalBlocks: worklogs.length,
    totalMessages,
    totalBytes,
    lastActivity,
    byLane,
    byProject,
  };
}
