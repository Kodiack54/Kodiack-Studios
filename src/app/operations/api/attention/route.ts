import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.PG_HOST || '127.0.0.1',
  port: parseInt(process.env.PG_PORT || '9432'),
  database: process.env.PG_DATABASE || 'kodiack_ai',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD,
});

interface AttentionItem {
  type: 'git' | 'db' | 'droplet';
  entity_id: string;
  title: string;
  attention_level: 'warn' | 'urgent';
  age_seconds: number;
  summary: string;
  deep_link: string;
  diagnostics: Record<string, any>;
}

/**
 * Build a human-readable summary for git drift
 */
function buildGitSummary(state: any, reasons: string[]): string {
  const parts: string[] = [];
  const branch = state.branch || 'unknown';
  
  // Dirty = uncommitted changes
  if (state.is_dirty || state.dirty) {
    parts.push('uncommitted changes');
  }
  
  // Ahead/behind
  const ahead = state.ahead || 0;
  const behind = state.behind || 0;
  if (ahead > 0 && behind > 0) {
    parts.push(`${ahead} ahead, ${behind} behind`);
  } else if (ahead > 0) {
    parts.push(`${ahead} commits to push`);
  } else if (behind > 0) {
    parts.push(`${behind} commits behind`);
  }
  
  // SHA mismatch without ahead/behind means diverged or reset
  if (reasons.includes('sha_mismatch') && ahead === 0 && behind === 0 && !state.is_dirty && !state.dirty) {
    parts.push('SHA mismatch (force push?)');
  }
  
  if (parts.length === 0) {
    return `Drift on ${branch}`;
  }
  
  return `${branch}: ${parts.join(', ')}`;
}

export async function GET() {
  try {
    const items: AttentionItem[] = [];

    // 1. Query Git repos with drift (orange/red status)
    const gitResult = await pool.query(`
      SELECT
        id,
        node_id,
        drift_status,
        drift_reasons,
        current_state,
        node_sensor_last_seen,
        updated_at
      FROM ops.canonical_state
      WHERE type = 'repo'
        AND drift_status IN ('orange', 'red')
      ORDER BY
        CASE drift_status WHEN 'red' THEN 1 WHEN 'orange' THEN 2 END,
        updated_at ASC
    `);

    for (const row of gitResult.rows) {
      const state = row.current_state || {};
      const repoSlug = state.repo || row.id.split(':').pop() || row.id;
      const lastSeen = row.node_sensor_last_seen || row.updated_at;
      const ageSeconds = lastSeen ? Math.floor((Date.now() - new Date(lastSeen).getTime()) / 1000) : 0;

      const reasons = row.drift_reasons || [];
      const summary = buildGitSummary(state, reasons);

      items.push({
        type: 'git',
        entity_id: repoSlug,
        title: repoSlug,
        attention_level: row.drift_status === 'red' ? 'urgent' : 'warn',
        age_seconds: ageSeconds,
        summary,
        deep_link: `/git-database?repo=${encodeURIComponent(repoSlug)}`,
        diagnostics: {
          node_id: row.node_id,
          drift_status: row.drift_status,
          drift_reasons: reasons,
          branch: state.branch,
          head: state.local_sha || state.head,
          dirty: state.is_dirty || state.dirty,
          ahead: state.ahead || 0,
          behind: state.behind || 0,
          last_seen: lastSeen,
        },
      });
    }

    // 2. Query DB schemas with attention (if table exists)
    try {
      const dbResult = await pool.query(`
        SELECT
          db_key,
          repo_slug,
          droplet_id,
          db_type,
          db_host,
          db_name,
          status,
          attention_level,
          schema_hash,
          tables_count,
          drift_detected_at,
          last_seen,
          last_error,
          updated_at
        FROM ops.current_state_db_schema
        WHERE attention_level IN ('warn', 'urgent')
        ORDER BY
          CASE attention_level WHEN 'urgent' THEN 1 WHEN 'warn' THEN 2 END,
          drift_detected_at ASC
      `);

      for (const row of dbResult.rows) {
        const driftAt = row.drift_detected_at || row.updated_at;
        const ageSeconds = driftAt ? Math.floor((Date.now() - new Date(driftAt).getTime()) / 1000) : 0;

        const summary = row.last_error
          ? `Error: ${row.last_error.slice(0, 50)}`
          : `Schema drift on ${row.db_name} (${row.tables_count || 0} tables)`;

        items.push({
          type: 'db',
          entity_id: row.db_key,
          title: row.db_name || row.db_key,
          attention_level: row.attention_level,
          age_seconds: ageSeconds,
          summary,
          deep_link: `/git-database?db=${encodeURIComponent(row.db_key)}`,
          diagnostics: {
            db_key: row.db_key,
            repo_slug: row.repo_slug,
            droplet_id: row.droplet_id,
            db_type: row.db_type,
            db_host: row.db_host,
            db_name: row.db_name,
            status: row.status,
            schema_hash: row.schema_hash,
            tables_count: row.tables_count,
            drift_detected_at: row.drift_detected_at,
            last_seen: row.last_seen,
            last_error: row.last_error,
          },
        });
      }
    } catch {
      // Table might not exist yet - that's OK
    }

    // 3. Query Droplets with issues (if we have droplet status)
    try {
      const dropletResult = await pool.query(`
        SELECT
          id,
          node_id,
          current_state,
          updated_at
        FROM ops.canonical_state
        WHERE type = 'node'
          AND (
            (current_state->>'stopped_count')::int > 0
            OR (current_state->>'errored_count')::int > 0
          )
        ORDER BY updated_at ASC
      `);

      for (const row of dropletResult.rows) {
        const state = row.current_state || {};
        const stoppedCount = parseInt(state.stopped_count || '0', 10);
        const erroredCount = parseInt(state.errored_count || '0', 10);
        const ageSeconds = row.updated_at ? Math.floor((Date.now() - new Date(row.updated_at).getTime()) / 1000) : 0;

        const hasErrors = erroredCount > 0;
        const summary = hasErrors
          ? `${erroredCount} errored, ${stoppedCount} stopped`
          : `${stoppedCount} services stopped`;

        items.push({
          type: 'droplet',
          entity_id: row.node_id,
          title: state.droplet_name || row.node_id,
          attention_level: hasErrors ? 'urgent' : 'warn',
          age_seconds: ageSeconds,
          summary,
          deep_link: `/droplets?node=${encodeURIComponent(row.node_id)}`,
          diagnostics: {
            node_id: row.node_id,
            droplet_name: state.droplet_name,
            total_services: state.total_services,
            running_count: state.running_count,
            stopped_count: stoppedCount,
            errored_count: erroredCount,
            last_seen: row.updated_at,
          },
        });
      }
    } catch {
      // Query might fail if columns don't exist - that's OK
    }

    // Sort all items: urgent first, then by age (oldest first)
    items.sort((a, b) => {
      if (a.attention_level !== b.attention_level) {
        return a.attention_level === 'urgent' ? -1 : 1;
      }
      return b.age_seconds - a.age_seconds; // Oldest first within same level
    });

    // Calculate overall attention level
    const urgentCount = items.filter(i => i.attention_level === 'urgent').length;
    const warnCount = items.filter(i => i.attention_level === 'warn').length;

    let overall: 'none' | 'warn' | 'urgent' = 'none';
    if (urgentCount > 0) overall = 'urgent';
    else if (warnCount > 0) overall = 'warn';

    return NextResponse.json({
      success: true,
      attention: {
        overall,
        counts: {
          total: items.length,
          urgent: urgentCount,
          warn: warnCount,
        },
      },
      items,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Attention API error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
