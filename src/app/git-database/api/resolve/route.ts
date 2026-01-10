import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.PG_HOST || '127.0.0.1',
  port: parseInt(process.env.PG_PORT || '9432'),
  database: process.env.PG_DATABASE || 'kodiack_ai',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'K0d1ack_Pr0d_2025_Rx9',
  max: 5
});

/**
 * Resolve identifier -> repo_slug using saved config
 * Checks: pm2_name first, then repo_slug direct match
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');
  const droplet = searchParams.get('droplet');

  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing id parameter' });
  }

  try {
    // Strategy 1: Check if id matches pm2_name in saved config
    let query = `
      SELECT repo_slug, pm2_name, droplet_name, display_name
      FROM ops.repo_registry 
      WHERE pm2_name = $1
    `;
    let params: string[] = [id];
    
    if (droplet) {
      query += ` AND droplet_name = $2`;
      params.push(droplet);
    }
    
    let result = await pool.query(query, params);
    
    if (result.rows.length > 0) {
      return NextResponse.json({ 
        success: true, 
        repo_slug: result.rows[0].repo_slug,
        display_name: result.rows[0].display_name,
        source: 'pm2_name',
        matched_pm2: result.rows[0].pm2_name,
        droplet: result.rows[0].droplet_name
      });
    }

    // Strategy 2: Check if id IS the repo_slug directly
    result = await pool.query(`
      SELECT repo_slug, pm2_name, droplet_name, display_name
      FROM ops.repo_registry 
      WHERE repo_slug = $1
    `, [id]);
    
    if (result.rows.length > 0) {
      return NextResponse.json({ 
        success: true, 
        repo_slug: result.rows[0].repo_slug,
        display_name: result.rows[0].display_name,
        source: 'direct_slug',
        droplet: result.rows[0].droplet_name
      });
    }

    // Strategy 3: Fuzzy match - id is part of repo_slug
    result = await pool.query(`
      SELECT repo_slug, pm2_name, droplet_name, display_name
      FROM ops.repo_registry 
      WHERE repo_slug LIKE '%' || $1
    `, [id]);
    
    if (result.rows.length === 1) {
      return NextResponse.json({ 
        success: true, 
        repo_slug: result.rows[0].repo_slug,
        display_name: result.rows[0].display_name,
        source: 'fuzzy_match',
        droplet: result.rows[0].droplet_name
      });
    }

    // Multiple fuzzy matches = ambiguous, fail closed
    if (result.rows.length > 1) {
      return NextResponse.json({ 
        success: false, 
        error: 'Ambiguous match',
        searched_id: id,
        matches: result.rows.map(r => r.repo_slug),
        suggestion: 'Multiple repos match this ID. Link explicitly in git-database config.'
      });
    }

    // No match found
    return NextResponse.json({ 
      success: false, 
      error: 'No repo found',
      searched_id: id,
      suggestion: 'Link this service to a repo in git-database config'
    });

  } catch (err) {
    console.error('Resolve error:', err);
    return NextResponse.json({ 
      success: false, 
      error: 'Database error',
      details: (err as Error).message 
    });
  }
}
