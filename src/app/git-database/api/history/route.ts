import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.PG_HOST || '127.0.0.1',
  port: parseInt(process.env.PG_PORT || '9432'),
  database: process.env.PG_DATABASE || 'kodiack_ai',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD,
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const repo = searchParams.get('repo');
  const node = searchParams.get('node') || 'studio-dev';
  const limit = parseInt(searchParams.get('limit') || '50');

  if (!repo) {
    return NextResponse.json({ success: false, error: 'repo parameter required' }, { status: 400 });
  }

  try {
    // Get git commit history from ops events
    const result = await pool.query(`
      SELECT 
        id,
        event_type,
        metadata,
        timestamp
      FROM public.dev_ops_events
      WHERE event_type IN ('pc_git_commit', 'git_commit', 'node_report', 'pc_git_status')
      ORDER BY timestamp DESC
      LIMIT 500
    `);

    // Parse and format the history for this repo
    const commits: any[] = [];

    for (const row of result.rows) {
      if (row.event_type === 'pc_git_commit' || row.event_type === 'git_commit') {
        if (row.metadata?.repo === repo) {
          commits.push({
            id: row.id,
            type: 'commit',
            timestamp: row.timestamp,
            node: row.metadata?.node_id || node,
            old_head: row.metadata?.old_head,
            new_head: row.metadata?.new_head,
            branch: row.metadata?.branch,
            message: row.metadata?.commit_message || row.metadata?.last_commit_msg,
          });
        }
      } else if (row.event_type === 'node_report') {
        const repos = row.metadata?.git_repos || [];
        const repoData = repos.find((r: any) => r.repo === repo || r.path?.includes(repo));
        if (repoData) {
          commits.push({
            id: row.id,
            type: 'snapshot',
            timestamp: row.timestamp,
            node: row.metadata?.node_id || 'server',
            head: repoData.local_sha,
            branch: repoData.branch,
            dirty: repoData.is_dirty,
            message: repoData.last_commit_msg,
          });
        }
      } else if (row.event_type === 'pc_git_status') {
        const repos = row.metadata?.repos || [];
        const repoData = repos.find((r: any) => r.repo === repo);
        if (repoData) {
          commits.push({
            id: row.id,
            type: 'snapshot',
            timestamp: row.timestamp,
            node: 'user-pc',
            head: repoData.head,
            branch: repoData.branch,
            dirty: repoData.dirty,
            message: repoData.last_commit_msg,
          });
        }
      }
    }

    // Dedupe by head SHA to show unique states
    const seen = new Set();
    const uniqueCommits = commits.filter(c => {
      const key = `${c.node}-${c.new_head || c.head}`;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json({
      success: true,
      repo,
      node,
      history: uniqueCommits.slice(0, limit),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Git history error:', error);
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 });
  }
}
