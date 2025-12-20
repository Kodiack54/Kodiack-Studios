import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  host: '127.0.0.1',
  port: 5432,
  database: 'kodiack_ai',
  user: 'postgres',
  password: 'kodiack2025',
});

// GET - List all clients
export async function GET() {
  try {
    const result = await pool.query(
      'SELECT * FROM dev_clients ORDER BY created_at DESC'
    );
    return NextResponse.json(result.rows);
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
