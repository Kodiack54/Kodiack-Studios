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
 * Get full commit details for a specific SHA
 * GET /git-database/api/git-commit?repo=ai-chad-5401&sha=25138ae
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const repo = searchParams.get('repo');
  const sha = searchParams.get('sha');

  if (!repo || !sha) {
    return NextResponse.json({ success: false, error: 'Missing repo or sha parameter' });
  }

  // Validate SHA format (basic check)
  if (!/^[a-f0-9]{6,40}$/i.test(sha)) {
    return NextResponse.json({ success: false, error: 'Invalid SHA format' });
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

    // Get full commit message
    let fullMessage: string;
    try {
      fullMessage = execSync(`git -C "${serverPath}" show -s --format=%B ${sha}`, {
        encoding: 'utf8',
        timeout: 5000
      }).trim();
    } catch {
      return NextResponse.json({ success: false, error: 'Commit not found' });
    }

    // Get commit metadata
    const metaFormat = '%H|%h|%an|%ae|%ad|%s';
    const metaRaw = execSync(`git -C "${serverPath}" show -s --format="${metaFormat}" --date=iso ${sha}`, {
      encoding: 'utf8',
      timeout: 5000
    }).trim();
    
    const [fullSha, shortSha, authorName, authorEmail, date, subject] = metaRaw.split('|');

    // Get changed files (stat)
    let stat: string;
    try {
      stat = execSync(`git -C "${serverPath}" show --stat --format="" ${sha}`, {
        encoding: 'utf8',
        timeout: 5000
      }).trim();
    } catch {
      stat = '';
    }

    // Parse body (everything after subject line)
    const lines = fullMessage.split('\n');
    const body = lines.slice(1).join('\n').trim();

    return NextResponse.json({
      success: true,
      commit: {
        sha: fullSha,
        sha_short: shortSha,
        subject,
        body,
        full_message: fullMessage,
        author: {
          name: authorName,
          email: authorEmail
        },
        date,
        stat
      }
    });

  } catch (err) {
    console.error('Git commit error:', err);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to get commit details',
      details: (err as Error).message 
    });
  }
}
