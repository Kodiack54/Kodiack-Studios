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
    const urlSet = new Set<string>();
    
    // 1. Get GitHub usernames/orgs from config table
    let githubSources: string[] = [];
    try {
      const configResult = await pool.query(`
        SELECT value FROM ops.config WHERE key = 'github_sources'
      `);
      if (configResult.rows.length > 0) {
        githubSources = JSON.parse(configResult.rows[0].value);
      }
    } catch (e) {
      // Fall back to env var if config table doesn't exist
      const envSources = process.env.GITHUB_SOURCES;
      if (envSources) {
        githubSources = envSources.split(',').map(s => s.trim());
      }
    }
    
    // 2. Fetch from GitHub API for each source
    for (const source of githubSources) {
      try {
        const ghRes = await fetch(`https://api.github.com/users/${source}/repos?per_page=100&sort=updated`, {
          headers: { 'Accept': 'application/vnd.github.v3+json' },
          next: { revalidate: 300 }
        });
        if (ghRes.ok) {
          const repos = await ghRes.json();
          for (const repo of repos) {
            if (repo.html_url) {
              urlSet.add(repo.html_url);
            }
          }
        }
      } catch (e) {
        console.error(`GitHub API error for ${source}:`, e);
      }
    }
    
    // 3. Also get from origin snapshots (9402 tracking) as backup
    try {
      const result = await pool.query(`
        SELECT DISTINCT jsonb_array_elements(origin_refs)->>'github_url' as github_url
        FROM ops.origin_snapshot
        WHERE snapshot_time > NOW() - INTERVAL '1 hour'
        ORDER BY github_url
      `);
      for (const row of result.rows) {
        if (row.github_url && row.github_url.includes('github.com')) {
          const normalized = row.github_url.replace(/\.git$/, '');
          urlSet.add(normalized);
        }
      }
    } catch (e) {
      console.error('DB query error:', e);
    }
    
    // Get already claimed github_urls from registry
    const claimedResult = await pool.query(`
      SELECT github_url, repo_slug FROM ops.repo_registry 
      WHERE github_url IS NOT NULL
    `);
    const claimedUrls: Record<string, string> = {};
    for (const row of claimedResult.rows) {
      if (row.github_url) {
        claimedUrls[row.github_url] = row.repo_slug;
      }
    }
    
    const urls = Array.from(urlSet).sort();
    
    return NextResponse.json({ 
      success: true, 
      urls,
      claimedUrls 
    });
  } catch (error) {
    console.error('Error fetching GitHub URLs:', error);
    return NextResponse.json({ success: false, error: String(error), urls: [], claimedUrls: {} });
  }
}
