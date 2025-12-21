import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  host: '127.0.0.1',
  port: 9432,
  database: 'kodiack_ai',
  user: 'postgres',
  password: 'kodiack2025',
});

// GET - List all clients with team and projects
export async function GET() {
  try {
    // Get clients
    const clientsResult = await pool.query(
      'SELECT * FROM dev_clients ORDER BY created_at DESC'
    );

    // For each client, get assigned devs and projects
    const clientsWithDetails = await Promise.all(
      clientsResult.rows.map(async (client) => {
        // Get assigned team members
        const teamResult = await pool.query(
          `SELECT u.id, u.name, u.first_name, u.last_name, u.email, u.avatar_url, uc.role
           FROM dev_user_clients uc
           JOIN dev_users u ON uc.user_id = u.id
           WHERE uc.client_id = $1
           ORDER BY u.first_name, u.last_name`,
          [client.id]
        );

        // Get projects (only top-level, not children)
        const projectsResult = await pool.query(
          `SELECT id, name, slug, logo_url
           FROM dev_projects
           WHERE client_id = $1 AND (parent_id IS NULL OR is_parent = true)
           ORDER BY sort_order, name
           LIMIT 8`,
          [client.id]
        );

        return {
          ...client,
          team: teamResult.rows,
          projects: projectsResult.rows,
        };
      })
    );

    return NextResponse.json(clientsWithDetails);
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}

// POST - Create new client
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, slug, description } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
    }

    // Validate slug format (lowercase, no spaces, alphanumeric with hyphens)
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      return NextResponse.json({
        error: 'Slug must be lowercase alphanumeric with hyphens only'
      }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO dev_clients (name, slug, description, active)
       VALUES ($1, $2, $3, true)
       RETURNING *`,
      [name, slug, description || null]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    console.error('Error creating client:', error);

    if (error.code === '23505') { // Unique violation
      return NextResponse.json({ error: 'A client with this slug already exists' }, { status: 409 });
    }

    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}
