import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.PG_HOST || '127.0.0.1',
  port: parseInt(process.env.PG_PORT || '9432'),
  database: process.env.PG_DATABASE || 'kodiack_ai',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD,
});

export async function GET() {
  try {
    // Get canonical state for repos and nodes
    const stateResult = await pool.query(`
      SELECT 
        id,
        type,
        node_id,
        drift_status,
        drift_reasons,
        current_state,
        node_sensor_last_seen,
        origin_tracker_last_seen,
        updated_at
      FROM ops.canonical_state
      WHERE type IN ('node', 'repo')
      ORDER BY node_id, type, id
    `);

    // Get recent PC git events
    const pcEventsResult = await pool.query(`
      SELECT 
        metadata,
        timestamp
      FROM public.dev_ops_events
      WHERE event_type = 'pc_git_status'
      ORDER BY timestamp DESC
      LIMIT 1
    `);

    // Build repos list with server state
    const repos: any[] = [];
    const nodesSeen = new Set<string>();

    for (const row of stateResult.rows) {
      if (row.type === 'repo') {
        const state = row.current_state || {};
        repos.push({
          id: row.id,
          repo: state.repo || row.id.split(':').pop(),
          node_id: row.node_id,
          branch: state.branch || 'unknown',
          server_sha: state.local_sha || state.head || null,
          server_dirty: state.is_dirty || state.dirty || false,
          ahead: state.ahead || 0,
          behind: state.behind || 0,
          drift_status: row.drift_status || 'gray',
          drift_reasons: row.drift_reasons || [],
          last_seen: row.node_sensor_last_seen || row.updated_at,
          last_commit_msg: state.last_commit_msg,
        });
        nodesSeen.add(row.node_id);
      }
    }

    // Parse PC git status and merge
    let pcRepos: any[] = [];
    let pcLastSeen: string | null = null;
    
    if (pcEventsResult.rows.length > 0) {
      const pcEvent = pcEventsResult.rows[0];
      const meta = pcEvent.metadata || {};
      pcLastSeen = pcEvent.timestamp;
      
      if (meta.repos) {
        pcRepos = meta.repos.map((r: any) => ({
          repo: r.repo,
          branch: r.branch,
          pc_sha: r.head,
          pc_dirty: r.dirty,
          ahead: r.ahead || 0,
          behind: r.behind || 0,
        }));
      }
    }

    // Merge PC data into repos (by repo name match)
    for (const repo of repos) {
      const pcRepo = pcRepos.find(p => p.repo === repo.repo);
      if (pcRepo) {
        repo.pc_sha = pcRepo.pc_sha;
        repo.pc_dirty = pcRepo.pc_dirty;
        repo.pc_branch = pcRepo.branch;
        repo.pc_ahead = pcRepo.ahead;
        repo.pc_behind = pcRepo.behind;
      }
    }

    // Calculate drift summary
    const summary = {
      total_repos: repos.length,
      green_count: repos.filter(r => r.drift_status === 'green').length,
      orange_count: repos.filter(r => r.drift_status === 'orange').length,
      red_count: repos.filter(r => r.drift_status === 'red').length,
      gray_count: repos.filter(r => r.drift_status === 'gray').length,
      pc_repos_count: pcRepos.length,
      nodes: Array.from(nodesSeen),
    };

    return NextResponse.json({
      success: true,
      repos,
      pc_repos: pcRepos,
      summary,
      last_seen: {
        server: stateResult.rows[0]?.updated_at || null,
        pc: pcLastSeen,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Git database status API error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
