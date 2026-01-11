/**
 * DB Targets API
 * Returns available database targets for dropdown selection
 * Data comes from ops.db_targets table
 */

import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DB_KODIACK_AI_URL,
});

interface DbTargetResponse {
  db_key: string;
  name: string;
  node_id: string;
  db_type: string;
  db_name: string | null;
  is_enabled: boolean;
}

// GET - List all enabled DB targets for dropdown
export async function GET() {
  try {
    const result = await pool.query<DbTargetResponse>(`
      SELECT
        db_key,
        name,
        node_id,
        db_type,
        db_name,
        is_enabled
      FROM ops.db_targets
      WHERE is_enabled = true
      ORDER BY name
    `);

    return NextResponse.json({
      success: true,
      targets: result.rows,
    });
  } catch (error) {
    console.error('[DB Targets API] GET error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
