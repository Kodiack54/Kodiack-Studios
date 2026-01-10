import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.PG_HOST || '127.0.0.1',
  port: parseInt(process.env.PG_PORT || '9432'),
  database: process.env.PG_DATABASE || 'kodiack_ai',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'K0d1ack_Pr0d_2025_Rx9',
  max: 5
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

    // Get ALL repo configs to merge overrides
    const configResult = await pool.query(`
      SELECT 
        repo_slug,
        display_name,
        server_path,
        pc_path,
        github_url,
        is_active,
        is_ai_team,
        notes,
        droplet_name,
        pm2_name,
        client_id,
        project_id
      FROM ops.repo_registry
      WHERE is_active = true
    `);

    // Build config lookup map by repo_slug
    const configMap = new Map<string, any>();
    for (const cfg of configResult.rows) {
      configMap.set(cfg.repo_slug, cfg);
    }

    // Get recent PC git events for comparison
    const pcEventsResult = await pool.query(`
      SELECT 
        metadata,
        timestamp
      FROM public.dev_ops_events
      WHERE event_type = 'pc_git_status'
      ORDER BY timestamp DESC
      LIMIT 1
    `);

    // Build node/repo structure
    const nodesMap = new Map<string, {
      id: string;
      node_id: string;
      drift_status: string;
      drift_reasons: string[];
      repos: any[];
      last_report: string;
    }>();

    for (const row of stateResult.rows) {
      if (row.type === 'node') {
        nodesMap.set(row.node_id, {
          id: row.id,
          node_id: row.node_id,
          drift_status: row.drift_status || 'gray',
          drift_reasons: row.drift_reasons || [],
          repos: [],
          last_report: row.updated_at,
        });
      }
    }

    // Add repos to their nodes, merging config overrides
    for (const row of stateResult.rows) {
      if (row.type === 'repo') {
        const node = nodesMap.get(row.node_id);
        if (node) {
          const state = row.current_state || {};
          const repoSlug = state.repo || row.id.split(':').pop();
          
          // Get saved config if exists
          const config = configMap.get(repoSlug);
          
          // Merge: config overrides discovered values
          node.repos.push({
            id: row.id,
            repo: repoSlug,
            node_id: row.node_id,
            branch: state.branch || 'unknown',
            local_sha: state.local_sha || state.head || '',
            origin_sha: state.origin_sha || null,
            is_dirty: state.is_dirty || state.dirty || false,
            ahead: state.ahead || 0,
            behind: state.behind || 0,
            drift_status: row.drift_status || 'gray',
            drift_reasons: row.drift_reasons || [],
            last_seen: row.node_sensor_last_seen || row.updated_at,
            last_commit_msg: state.last_commit_msg,
            // Config overrides for display
            display_name: config?.display_name || null,
            path: config?.server_path || state.path,
            github_url: config?.github_url || state.github_url,
            is_ai_team: config?.is_ai_team || false,
            pm2_name: config?.pm2_name || null,
            droplet_name: config?.droplet_name || null,
            notes: config?.notes || null,
          });
        }
      }
    }

    // Parse PC git status, merging config overrides
    let pcState = null;
    if (pcEventsResult.rows.length > 0) {
      const pcEvent = pcEventsResult.rows[0];
      const meta = pcEvent.metadata || {};
      if (meta.repos) {
        pcState = {
          node_id: 'user-pc',
          repos: meta.repos.map((r: any) => {
            const config = configMap.get(r.repo);
            return {
              repo: r.repo,
              branch: r.branch,
              head: r.head,
              dirty: r.dirty,
              ahead: r.ahead || 0,
              behind: r.behind || 0,
              last_seen: pcEvent.timestamp,
              last_commit_msg: r.last_commit_msg,
              last_commit_time: r.last_commit_time,
              display_name: config?.display_name || null,
              path: config?.pc_path || r.path,
              is_ai_team: config?.is_ai_team || false,
            };
          }),
        };
      }
    }

    return NextResponse.json({
      success: true,
      nodes: Array.from(nodesMap.values()),
      pc: pcState,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Git drift API error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
