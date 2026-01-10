/**
 * Individual Repo Registry API
 * Get, update, delete a single repo entry
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

// GET - Get single repo
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  
  try {
    const result = await pool.query(
      'SELECT * FROM ops.repo_registry WHERE repo_slug = $1',
      [slug]
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Repo not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      repo: result.rows[0]
    });
  } catch (error) {
    console.error('[Repo Registry] GET error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

// PUT - Update repo
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  
  try {
    const body = await request.json();
    const { 
      display_name, server_path, pc_path, github_url, is_active, is_ai_team, is_ignored, notes,
      droplet_name, pm2_name, client_id, project_id,
      db_type, db_target_id, db_name, db_schema
    } = body;
    
    const result = await pool.query(`
      UPDATE ops.repo_registry SET
        display_name = COALESCE($2, display_name),
        server_path = $3,
        pc_path = $4,
        github_url = $5,
        is_active = COALESCE($6, is_active),
        is_ai_team = COALESCE($7, is_ai_team),
        is_ignored = COALESCE($8, is_ignored),
        notes = $9,
        droplet_name = $10,
        pm2_name = $11,
        client_id = $12,
        project_id = $13,
        db_type = $14,
        db_target_id = $15,
        db_name = $16,
        db_schema = COALESCE($17, 'public'),
        updated_at = NOW()
      WHERE repo_slug = $1
      RETURNING *
    `, [slug, display_name, server_path, pc_path, github_url, is_active, is_ai_team, is_ignored, notes,
        droplet_name, pm2_name, client_id || null, project_id || null,
        db_type || null, db_target_id || null, db_name || null, db_schema]);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Repo not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      repo: result.rows[0]
    });
  } catch (error) {
    console.error('[Repo Registry] PUT error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE - Remove repo from registry (or mark inactive)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  
  try {
    // Soft delete - just mark inactive
    const result = await pool.query(`
      UPDATE ops.repo_registry 
      SET is_active = false, updated_at = NOW()
      WHERE repo_slug = $1
      RETURNING *
    `, [slug]);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Repo not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Repo deactivated'
    });
  } catch (error) {
    console.error('[Repo Registry] DELETE error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
