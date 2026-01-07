/**
 * API Route: /api/operations/control/[serviceId]
 * Handle PM2 control actions for operations services
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleControlRequest } from '@/app/operations/api/control';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  const { serviceId } = await params;

  try {
    const body = await request.json();
    const action = body.action as 'start' | 'restart' | 'stop';

    if (!action || !['start', 'restart', 'stop'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be start, restart, or stop' },
        { status: 400 }
      );
    }

    return handleControlRequest(serviceId, action);
  } catch (error) {
    console.error('[Operations Control API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process control request' },
      { status: 500 }
    );
  }
}
