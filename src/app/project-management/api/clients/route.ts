import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /project-management/api/clients
 * List all active clients for the project form dropdown
 */
export async function GET() {
  try {
    const { data: clients, error } = await db
      .from('dev_clients')
      .select('id, name, slug')
      .eq('active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching clients:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch clients' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      clients: clients || [],
    });
  } catch (error) {
    console.error('Error in clients GET:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
