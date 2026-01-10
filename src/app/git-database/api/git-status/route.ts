import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const pool = new Pool({
  host: process.env.PG_HOST || '127.0.0.1',
  port: parseInt(process.env.PG_PORT || '9432'),
  database: process.env.PG_DATABASE || 'kodiack_ai',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'K0d1ack_Pr0d_2025_Rx9',
  max: 5
});

/**
 * Get git status (dirty files) for a repo
 * GET /git-database/api/git-status?repo=ai-chad-5401
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const repo = searchParams.get('repo');

  if (!repo) {
    return NextResponse.json({ success: false, error: 'Missing repo parameter' });
  }

  try {
    // Find server_path for this repo
    let serverPath: string | null = null;

    const regResult = await pool.query(`
      SELECT server_path FROM ops.repo_registry WHERE repo_slug = $1
    `, [repo]);
    
    if (regResult.rows.length > 0 && regResult.rows[0].server_path) {
      serverPath = regResult.rows[0].server_path;
    }

    if (!serverPath) {
      const stateResult = await pool.query(`
        SELECT current_state->>'path' as path 
        FROM ops.canonical_state 
        WHERE type = 'repo' AND (
          current_state->>'repo' = $1 
          OR id LIKE '%:' || $1
        )
        LIMIT 1
      `, [repo]);
      
      if (stateResult.rows.length > 0 && stateResult.rows[0].path) {
        serverPath = stateResult.rows[0].path;
      }
    }

    if (!serverPath) {
      return NextResponse.json({ success: false, error: 'Server path not found for repo' });
    }

    // Validate path
    if (!existsSync(serverPath) || !existsSync(join(serverPath, '.git'))) {
      return NextResponse.json({ success: false, error: 'Invalid git repository path' });
    }

    // Security check
    const allowedRoots = ['/var/www/', '/home/'];
    if (!allowedRoots.some(root => serverPath!.startsWith(root))) {
      return NextResponse.json({ success: false, error: 'Path outside allowed directories' });
    }

    // Get git status --porcelain
    let statusOutput: string;
    try {
      statusOutput = execSync(`git -C "${serverPath}" status --porcelain`, {
        encoding: 'utf8',
        timeout: 5000
      }).trim();
    } catch {
      statusOutput = '';
    }

    // Parse the status output
    const files = statusOutput
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const status = line.substring(0, 2);
        const file = line.substring(3);
        
        // Decode status codes
        let type = 'unknown';
        if (status.includes('M')) type = 'modified';
        else if (status.includes('A')) type = 'added';
        else if (status.includes('D')) type = 'deleted';
        else if (status.includes('R')) type = 'renamed';
        else if (status.includes('?')) type = 'untracked';
        else if (status.includes('!')) type = 'ignored';
        
        return { status: status.trim(), file, type };
      });

    return NextResponse.json({
      success: true,
      repo,
      path: serverPath,
      is_dirty: files.length > 0,
      file_count: files.length,
      files
    });

  } catch (err) {
    console.error('Git status error:', err);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to get git status',
      details: (err as Error).message 
    });
  }
}
