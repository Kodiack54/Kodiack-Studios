import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Fetch sessions from dev_session_logs (Chad's output)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Read from dev_session_logs (Chad writes here)
    let query = db.from('dev_session_logs')
      .select('id, pc_tag, pc_tag_norm, project_id, project_slug, user_id, mode, lane, window_start, window_end, segment_start, segment_end, first_ts, last_ts, raw_refs, raw_count, message_count, status, processed_at, processed_by, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching session logs:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch from database'
      }, { status: 500 });
    }

    // Transform to match UI expected format
    const sessions = (Array.isArray(data) ? data : []).map(row => ({
      id: row.id,
      started_at: row.segment_start || row.first_ts,
      ended_at: row.segment_end || row.last_ts,
      message_count: row.message_count || row.raw_count,
      // Map mode to source_type for UI compatibility
      source_type: row.mode === 'external' ? 'external_claude' : row.mode === 'internal' ? 'internal_claude' : row.mode,
      source_name: row.pc_tag,
      terminal_port: row.pc_tag?.match(/dev(\d)-(\d+)/)?.[2] || null,
      status: row.status,
      processed_by: row.processed_by,
      processed_at: row.processed_at,
      mode: row.lane || row.mode,
      project_id: row.project_id,
      project_slug: row.project_slug,
      pc_tag: row.pc_tag,
      created_at: row.created_at,
    }));

    return NextResponse.json({
      success: true,
      sessions,
      total: count || sessions.length,
      limit,
      offset: 0,
    });
  } catch (error) {
    console.error('Error fetching session logs:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch sessions'
    }, { status: 500 });
  }
}
