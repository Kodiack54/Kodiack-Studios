import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  host: '127.0.0.1',
  port: 9432,
  database: 'kodiack_ai',
  user: 'postgres',
  password: 'kodiack2025',
});

// GET - Fetch bucket/status counts from dev_ai_sessions
export async function GET() {
  try {
    // Get counts by status (bucket)
    const statusResult = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM dev_ai_sessions
      WHERE status IS NOT NULL
      GROUP BY status
      ORDER BY count DESC
    `);

    // Convert to object format
    const buckets: Record<string, number> = {};
    for (const row of statusResult.rows) {
      buckets[row.status] = parseInt(row.count);
    }

    // Also get some summary stats matching the pipeline:
    // active → captured → flagged → pending → cleaned → archived
    const statsResult = await pool.query(`
      SELECT
        COUNT(*) as total_sessions,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'captured') as captured,
        COUNT(*) FILTER (WHERE status = 'flagged') as flagged,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'cleaned') as cleaned,
        COUNT(*) FILTER (WHERE status = 'archived') as archived,
        COUNT(*) FILTER (WHERE started_at > NOW() - INTERVAL '24 hours') as last_24h,
        COUNT(*) FILTER (WHERE started_at > NOW() - INTERVAL '2 days') as last_2_days,
        MAX(started_at) as last_session
      FROM dev_ai_sessions
    `);

    return NextResponse.json({
      success: true,
      buckets,
      stats: statsResult.rows[0],
    });
  } catch (error) {
    console.error('Error fetching bucket counts:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch buckets'
    }, { status: 500 });
  }
}
