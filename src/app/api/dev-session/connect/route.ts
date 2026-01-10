import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Kodiack AI Team definitions matching the frontend
const KODIACK_AI_TEAM = [
  { name: 'Claude', role: 'Lead Developer', portOffset: 0 },
  { name: 'Chad', role: 'Transcription & Capture', portOffset: 1 },
  { name: 'Jen', role: 'Scrubbing & Signal Extraction', portOffset: 2 },
  { name: 'Susan', role: 'Classification & Sorting', portOffset: 3 },
  { name: 'Clair', role: 'Conversion & Documentation', portOffset: 4 },
  { name: 'Mike', role: 'QA Tester', portOffset: 5 },
  { name: 'Tiffany', role: 'QA Tester', portOffset: 6 },
  { name: 'Ryan', role: 'Roadmap & Prioritization', portOffset: 7 },
];

/**
 * POST /api/dev-session/connect
 * Start a dev session - connects user to AI team for their selected dev slot
 */
export async function POST(request: NextRequest) {
  try {
    const { devSlot, basePort, userId, projectId, projectSlug } = await request.json();

    if (!devSlot || !basePort || !userId || !projectId) {
      return NextResponse.json(
        { error: 'Missing required fields: devSlot, basePort, userId, projectId' },
        { status: 400 }
      );
    }

    // Get user's pc_tag for Chad to match transcripts
    const { data: userData } = await db
      .from('dev_users')
      .select('pc_tag')
      .eq('id', userId)
      .single();

    const pcTag = (userData as { pc_tag?: string } | null)?.pc_tag || null;

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

    // End any existing active session for this pc_tag (one session per PC)
    if (pcTag) {
      await db
        .from('dev_sessions')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('pc_tag', pcTag)
        .eq('status', 'active');
    }

    // Create new session record with pc_tag
    const sessionId = crypto.randomUUID();
    const { error: sessionError } = await db
      .from('dev_sessions')
      .insert({
        id: sessionId,
        user_id: userId,
        dev_slot: devSlot,
        base_port: basePort,
        project_id: projectId,
        pc_tag: pcTag,
        status: 'active',
        started_at: new Date().toISOString(),
      });

    if (sessionError) {
      console.error('Error creating session:', sessionError);
      // Table might not exist yet - continue anyway for now
    }

    // Build team member statuses (in a real impl, you'd check if team members are actually running)
    const teamStatuses = KODIACK_AI_TEAM.map(member => ({
      name: member.name,
      port: basePort + member.portOffset,
      status: 'online' as const, // Assume online for now
    }));

    console.log(`[DevSession] User ${userId} connected to ${devSlot} on project ${projectSlug} (ports ${basePort}-${basePort + 7}, pc_tag: ${pcTag})`);

    return NextResponse.json({
      success: true,
      sessionId,
      devSlot,
      basePort,
      projectId,
      projectSlug,
      pcTag,
      teamStatuses,
      message: `Connected to ${devSlot} AI team on project ${projectSlug}`,
    });

  } catch (error) {
    console.error('Error in dev-session connect:', error);
    return NextResponse.json(
      { error: 'Failed to connect dev session' },
      { status: 500 }
    );
  }
}
