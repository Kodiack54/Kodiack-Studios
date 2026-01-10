/**
 * Repo Registry API
 * List all repos, create new repo entries
 */

import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.PG_HOST || '127.0.0.1',
  port: parseInt(process.env.PG_PORT || '9432'),
  database: process.env.PG_DATABASE || 'kodiack_ai',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'K0d1ack_Pr0d_2025_Rx9',
});

// GET - List all repos
export async function GET() {
  try {
    const result = await pool.query(`
      SELECT * FROM ops.repo_registry 
      ORDER BY is_ai_team, repo_slug
    `);
    
    return NextResponse.json({
      success: true,
      repos: result.rows
    });
  } catch (error) {
    console.error('[Repo Registry] GET error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST - Create new repo entry
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      repo_slug, display_name, server_path, pc_path, github_url, 
      is_ai_team, notes, droplet_name, pm2_name, client_id, project_id,
      db_type, db_target_id, db_name, db_schema
    } = body;
    
    if (!repo_slug) {
      return NextResponse.json(
        { success: false, error: 'repo_slug is required' },
        { status: 400 }
      );
    }
    
    const result = await pool.query(`
      INSERT INTO ops.repo_registry 
        (repo_slug, display_name, server_path, pc_path, github_url, is_ai_team, notes, 
         droplet_name, pm2_name, client_id, project_id, auto_discovered,
         db_type, db_target_id, db_name, db_schema)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false, $12, $13, $14, $15)
      ON CONFLICT (repo_slug) DO UPDATE SET
        display_name = COALESCE(EXCLUDED.display_name, ops.repo_registry.display_name),
        server_path = COALESCE(EXCLUDED.server_path, ops.repo_registry.server_path),
        pc_path = COALESCE(EXCLUDED.pc_path, ops.repo_registry.pc_path),
        github_url = COALESCE(EXCLUDED.github_url, ops.repo_registry.github_url),
        is_ai_team = COALESCE(EXCLUDED.is_ai_team, ops.repo_registry.is_ai_team),
        notes = COALESCE(EXCLUDED.notes, ops.repo_registry.notes),
        droplet_name = COALESCE(EXCLUDED.droplet_name, ops.repo_registry.droplet_name),
        pm2_name = COALESCE(EXCLUDED.pm2_name, ops.repo_registry.pm2_name),
        client_id = COALESCE(EXCLUDED.client_id, ops.repo_registry.client_id),
        project_id = COALESCE(EXCLUDED.project_id, ops.repo_registry.project_id),
        db_type = COALESCE(EXCLUDED.db_type, ops.repo_registry.db_type),
        db_target_id = COALESCE(EXCLUDED.db_target_id, ops.repo_registry.db_target_id),
        db_name = COALESCE(EXCLUDED.db_name, ops.repo_registry.db_name),
        db_schema = COALESCE(EXCLUDED.db_schema, ops.repo_registry.db_schema),
        updated_at = NOW()
      RETURNING *
    `, [repo_slug, display_name, server_path, pc_path, github_url, 
        is_ai_team || false, notes, droplet_name, pm2_name, client_id, project_id,
        db_type, db_target_id, db_name, db_schema || 'public']);
    
    return NextResponse.json({
      success: true,
      repo: result.rows[0]
    });
  } catch (error) {
    console.error('[Repo Registry] POST error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
