import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  host: '127.0.0.1',
  port: 9432,
  database: 'kodiack_ai',
  user: 'postgres',
  password: 'kodiack2025',
});

// POST - Assign a dev to this client
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const body = await request.json();
    const { user_id, role } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO dev_user_clients (user_id, client_id, role)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [user_id, clientId, role || 'developer']
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    console.error('Error assigning dev:', error);

    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'This user is already assigned to this client' },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: 'Failed to assign dev' }, { status: 500 });
  }
}

// DELETE - Remove a dev assignment
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('assignmentId');

    if (!assignmentId) {
      return NextResponse.json({ error: 'assignmentId is required' }, { status: 400 });
    }

    await pool.query('DELETE FROM dev_user_clients WHERE id = $1', [assignmentId]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing dev assignment:', error);
    return NextResponse.json({ error: 'Failed to remove dev' }, { status: 500 });
  }
}
