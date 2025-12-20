import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  host: '127.0.0.1',
  port: 5432,
  database: 'kodiack_ai',
  user: 'postgres',
  password: 'kodiack2025',
});

// POST - Create a new project for this client
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const body = await request.json();
    const {
      name,
      slug,
      description,
      server_path,
      local_path,
      git_repo,
      droplet_name,
      droplet_ip,
      port_dev,
      port_test,
      port_prod,
      table_prefix,
    } = body;

    if (!name || !slug || !server_path) {
      return NextResponse.json(
        { error: 'Name, slug, and server_path are required' },
        { status: 400 }
      );
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      return NextResponse.json(
        { error: 'Slug must be lowercase alphanumeric with hyphens only' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO dev_projects (
        client_id, name, slug, description, server_path, local_path,
        git_repo, droplet_name, droplet_ip, port_dev, port_test, port_prod, table_prefix
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        clientId,
        name,
        slug,
        description || null,
        server_path,
        local_path || null,
        git_repo || null,
        droplet_name || null,
        droplet_ip || null,
        port_dev || null,
        port_test || null,
        port_prod || null,
        table_prefix || null,
      ]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    console.error('Error creating project:', error);

    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'A project with this slug already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
