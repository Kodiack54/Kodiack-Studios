import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  host: '127.0.0.1',
  port: 9432,
  database: 'kodiack_ai',
  user: 'postgres',
  password: 'kodiack2025',
});

// GET - List all users (for dropdowns, etc.)
export async function GET() {
  try {
    const result = await pool.query(
      `SELECT id, email, first_name, last_name, role, is_active
       FROM dev_users
       WHERE is_active = true
       ORDER BY first_name, last_name`
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
