import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// AI Worker definitions matching the frontend
const AI_WORKERS = [
  { name: 'Claude', role: 'Lead Developer', portOffset: 0 },
  { name: 'Chad', role: 'Scribe', portOffset: 1 },
  { name: 'Ryan', role: 'Project Manager', portOffset: 2 },
  { name: 'Susan', role: 'Memory Manager', portOffset: 3 },
  { name: 'Jen', role: 'Designer', portOffset: 4 },
  { name: 'Clair', role: 'Code Reviewer', portOffset: 5 },
  { name: 'Mike', role: 'QA Tester', portOffset: 6 },
];

/**
 * POST /api/dev-session/connect
 * Start a dev session - connects user to AI workers for their selected dev slot
 */
export async function POST(request: NextRequest) {
  try {
    const { devSlot, basePort, userId } = await request.json();

    if (!devSlot || !basePort || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: devSlot, basePort, userId' },
        { status: 400 }
      );
    }

    // Check if this dev slot is already in use by another user
    const { data: existingSessionData } = await db
      .from('dev_sessions')
      .select('*')
      .eq('dev_slot', devSlot)
      .eq('status', 'active')
      .single();

    const existingSession = existingSessionData as { user_id?: string } | null;

    if (existingSession && existingSession.user_id !== userId) {
      return NextResponse.json(
        { error: `Dev slot ${devSlot} is already in use by another developer` },
        { status: 409 }
      );
    }

    // Create or update session record
    const sessionId = crypto.randomUUID();
    const { error: sessionError } = await db
      .from('dev_sessions')
      .insert({
        id: sessionId,
        user_id: userId,
        dev_slot: devSlot,
        base_port: basePort,
        status: 'active',
        started_at: new Date().toISOString(),
      });

    if (sessionError) {
      console.error('Error creating session:', sessionError);
      // Table might not exist yet - continue anyway for now
    }

    // Build worker statuses (in a real impl, you'd check if workers are actually running)
    const workerStatuses = AI_WORKERS.map(worker => ({
      name: worker.name,
      port: basePort + worker.portOffset,
      status: 'online' as const, // Assume online for now
    }));

    console.log(`[DevSession] User ${userId} connected to ${devSlot} (ports ${basePort}-${basePort + 6})`);

    return NextResponse.json({
      success: true,
      sessionId,
      devSlot,
      basePort,
      workerStatuses,
      message: `Connected to ${devSlot} AI workers`,
    });

  } catch (error) {
    console.error('Error in dev-session connect:', error);
    return NextResponse.json(
      { error: 'Failed to connect dev session' },
      { status: 500 }
    );
  }
}
