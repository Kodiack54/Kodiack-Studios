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

interface GitCommit {
  sha: string;
  sha_short: string;
  author: string;
  date: string;
  message: string;
}

/**
 * Get real git log from server repo
 * GET /git-database/api/git-log?repo=ai-chad-5401&limit=50
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const repo = searchParams.get('repo');
  const limit = parseInt(searchParams.get('limit') || '50');

  if (!repo) {
    return NextResponse.json({ success: false, error: 'Missing repo parameter' });
  }

  try {
    // First, find the server_path for this repo from registry or canonical_state
    let serverPath: string | null = null;

    // Try registry first (config takes priority)
    const regResult = await pool.query(`
      SELECT server_path FROM ops.repo_registry WHERE repo_slug = $1
    `, [repo]);
    
    if (regResult.rows.length > 0 && regResult.rows[0].server_path) {
      serverPath = regResult.rows[0].server_path;
    }

    // Fallback to canonical_state if not in registry
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
      return NextResponse.json({ 
        success: false, 
        error: 'Server path not found for repo',
        repo 
      });
    }

    // Validate path exists and is a git repo
    if (!existsSync(serverPath)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Server path does not exist',
        path: serverPath,
        repo 
      });
    }

    // Check if it's a git repo (has .git folder or is a worktree)
    const gitDir = join(serverPath, '.git');
    if (!existsSync(gitDir)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Path is not a git repository (no .git folder)',
        path: serverPath,
        repo 
      });
    }

    // Security: ensure path is within allowed roots
    const allowedRoots = ['/var/www/', '/home/'];
    const isAllowed = allowedRoots.some(root => serverPath.startsWith(root));
    if (!isAllowed) {
      return NextResponse.json({ 
        success: false, 
        error: 'Path is outside allowed directories',
        repo 
      });
    }

    // Run git log on the server path
    // Format: sha|author|date|message
    const gitCmd = `git -C "${serverPath}" log -n ${limit} --date=iso --pretty=format:"%H|%h|%an|%ad|%s"`;
    
    let output: string;
    try {
      output = execSync(gitCmd, { 
        encoding: 'utf8', 
        timeout: 10000,
        windowsHide: true 
      });
    } catch (gitErr) {
      return NextResponse.json({ 
        success: false, 
        error: 'Git command failed',
        details: (gitErr as Error).message,
        path: serverPath
      });
    }

    // Parse the output
    const commits: GitCommit[] = output
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [sha, sha_short, author, date, ...messageParts] = line.split('|');
        return {
          sha,
          sha_short,
          author,
          date,
          message: messageParts.join('|') // In case message contains |
        };
      });

    return NextResponse.json({
      success: true,
      repo,
      path: serverPath,
      source: 'server',
      commits,
      count: commits.length
    });

  } catch (err) {
    console.error('Git log error:', err);
    return NextResponse.json({ 
      success: false, 
      error: 'Database error',
      details: (err as Error).message 
    });
  }
}
