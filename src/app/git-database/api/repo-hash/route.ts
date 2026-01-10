/**
 * Repo Hash API - Lightweight endpoint for polling
 * Returns only state_hash and last_updated for a repo
 * Detail page polls this; only fetches full detail when hash changes
 */

import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import crypto from 'crypto';

const pool = new Pool({
  host: process.env.PG_HOST || '127.0.0.1',
  port: parseInt(process.env.PG_PORT || '9432'),
  database: process.env.PG_DATABASE || 'kodiack_ai',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'K0d1ack_Pr0d_2025_Rx9',
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const repo = searchParams.get('repo');

  if (!repo) {
    return NextResponse.json({ success: false, error: 'repo required' }, { status: 400 });
  }

  try {
    // Get latest events for this repo from both server and PC (bounded by 7 days)
    const result = await pool.query(`
      WITH recent_events AS (
        SELECT 
          service_id,
          metadata,
          timestamp,
          ROW_NUMBER() OVER (PARTITION BY service_id ORDER BY timestamp DESC) as rn
        FROM ops.ops_events
        WHERE timestamp > NOW() - INTERVAL '7 days'
          AND event_type IN ('git_status', 'pc_git_status')
      )
      SELECT 
        service_id,
        metadata,
        timestamp
      FROM recent_events
      WHERE rn = 1
    `);

    // Build current state for this repo from latest events
    let serverState: any = null;
    let pcState: any = null;
    let lastUpdated: string | null = null;

    for (const row of result.rows) {
      const repos = row.metadata?.repos || [];
      const repoData = repos.find((r: any) => r.repo === repo);
      
      if (repoData) {
        if (row.service_id === 'user-pc') {
          pcState = { ...repoData, timestamp: row.timestamp };
        } else {
          serverState = { ...repoData, node_id: row.service_id, timestamp: row.timestamp };
        }
        
        // Track most recent update
        const ts = new Date(row.timestamp).toISOString();
        if (!lastUpdated || ts > lastUpdated) {
          lastUpdated = ts;
        }
      }
    }

    // Generate hash from current state
    const stateObj = { server: serverState, pc: pcState };
    const stateHash = crypto
      .createHash('md5')
      .update(JSON.stringify(stateObj))
      .digest('hex')
      .slice(0, 12);

    return NextResponse.json({
      success: true,
      repo_slug: repo,
      state_hash: stateHash,
      last_updated: lastUpdated,
      has_server: !!serverState,
      has_pc: !!pcState,
      server_last_seen: serverState?.timestamp || null,
      pc_last_seen: pcState?.timestamp || null
    });

  } catch (error) {
    console.error('[Repo Hash API] Error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
