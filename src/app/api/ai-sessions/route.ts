import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  host: '127.0.0.1',
  port: 9432,
  database: 'kodiack_ai',
  user: 'postgres',
  password: 'kodiack2025',
});

// GET - Fetch AI sessions with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const workspace = searchParams.get('workspace'); // Filter by team: global, dev1, dev2, dev3
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = `
      SELECT
        id,
        started_at,
        ended_at,
        message_count,
        last_message_at,
        terminal_port,
        user_name,
        project_path,
        source_type,
        source_name,
        summary,
        key_topics,
        files_modified,
        status,
        processed_by,
        processed_at,
        items_extracted,
        conflicts_found,
        workspace,
        created_at
      FROM dev_ai_sessions
    `;

    const params: (string | number)[] = [];
    const conditions: string[] = [];

    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    if (workspace) {
      params.push(workspace);
      conditions.push(`workspace = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY started_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Also get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM dev_ai_sessions';
    const countParams: string[] = [];
    const countConditions: string[] = [];

    if (status) {
      countParams.push(status);
      countConditions.push(`status = $${countParams.length}`);
    }
    if (workspace) {
      countParams.push(workspace);
      countConditions.push(`workspace = $${countParams.length}`);
    }
    if (countConditions.length > 0) {
      countQuery += ` WHERE ${countConditions.join(' AND ')}`;
    }
    const countResult = await pool.query(countQuery, countParams);

    return NextResponse.json({
      success: true,
      sessions: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching AI sessions:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch sessions'
    }, { status: 500 });
  }
}
