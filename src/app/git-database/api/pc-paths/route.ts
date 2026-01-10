import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  host: '127.0.0.1',
  port: 9432,
  database: 'kodiack_ai',
  user: 'postgres',
  password: 'K0d1ack_Pr0d_2025_Rx9',
});

export async function GET() {
  try {
    // Get PC paths from pc_git_status events
    const result = await pool.query(`
      SELECT DISTINCT 
        r->>'repo' as repo,
        r->>'path' as path
      FROM dev_ops_events e,
           jsonb_array_elements(e.metadata->'repos') as r
      WHERE e.event_type = 'pc_git_status'
        AND e.service_id = 'user-pc'
        AND e.timestamp > NOW() - INTERVAL '24 hours'
      ORDER BY repo
    `);
    
    const paths = result.rows
      .map(r => r.path)
      .filter(p => p && p.startsWith('C:\\'));
    
    // Get repo -> path mapping
    const repoPathMap: Record<string, string> = {};
    for (const row of result.rows) {
      if (row.repo && row.path) {
        repoPathMap[row.repo] = row.path;
      }
    }
    
    // Extract unique parent folders (workspace roots)
    const roots = new Set<string>();
    for (const path of paths) {
      const parts = path.split('\\');
      if (parts.length >= 3) {
        roots.add(parts.slice(0, -1).join('\\'));
      }
    }
    
    // Get already claimed pc_paths from registry
    const claimedResult = await pool.query(`
      SELECT pc_path, pc_root, repo_slug FROM ops.repo_registry 
      WHERE pc_path IS NOT NULL OR pc_root IS NOT NULL
    `);
    const claimedPaths = new Set(claimedResult.rows.map(r => r.pc_path).filter(Boolean));
    const claimedRoots: Record<string, string> = {};
    for (const row of claimedResult.rows) {
      if (row.pc_root) {
        claimedRoots[row.pc_root] = row.repo_slug;
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      paths,
      roots: Array.from(roots).sort(),
      repoPathMap,
      claimedPaths: Array.from(claimedPaths),
      claimedRoots
    });
  } catch (error) {
    console.error('Error fetching PC paths:', error);
    return NextResponse.json({ success: false, error: String(error), paths: [], roots: [], repoPathMap: {}, claimedPaths: [], claimedRoots: {} });
  }
}
