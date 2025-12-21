import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  host: '127.0.0.1',
  port: 9432,
  database: 'kodiack_ai',
  user: 'postgres',
  password: 'kodiack2025',
});

// GET - Get client details with projects and assigned devs
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get client
    const clientResult = await pool.query(
      'SELECT * FROM dev_clients WHERE id = $1',
      [id]
    );

    if (clientResult.rows.length === 0) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const client = clientResult.rows[0];

    // Get projects for this client
    const projectsResult = await pool.query(
      `SELECT * FROM dev_projects
       WHERE client_id = $1
       ORDER BY sort_order, name`,
      [id]
    );

    // Get assigned devs with user details
    const devsResult = await pool.query(
      `SELECT uc.id as assignment_id, uc.role, uc.created_at as assigned_at,
              u.id as user_id, u.email, u.first_name, u.last_name, u.role as user_role
       FROM dev_user_clients uc
       JOIN dev_users u ON uc.user_id = u.id
       WHERE uc.client_id = $1
       ORDER BY u.first_name, u.last_name`,
      [id]
    );

    return NextResponse.json({
      ...client,
      projects: projectsResult.rows,
      assignedDevs: devsResult.rows,
    });
  } catch (error) {
    console.error('Error fetching client:', error);
    return NextResponse.json({ error: 'Failed to fetch client' }, { status: 500 });
  }
}

// DELETE - Delete a client
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await pool.query('DELETE FROM dev_clients WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 });
  }
}
