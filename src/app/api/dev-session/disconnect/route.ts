import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/dev-session/disconnect
 * End a dev session - disconnects user from AI workers
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId, devSlot } = await request.json();

    if (!sessionId && !devSlot) {
      return NextResponse.json(
        { error: 'Missing sessionId or devSlot' },
        { status: 400 }
      );
    }

    // Update session status to ended
    if (sessionId) {
      const { error } = await db
        .from('dev_sessions')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (error) {
        console.error('Error ending session:', error);
        // Continue anyway - session tracking is optional
      }
    }

    console.log(`[DevSession] Session ${sessionId || devSlot} disconnected`);

    return NextResponse.json({
      success: true,
      message: 'Disconnected from dev session',
    });

  } catch (error) {
    console.error('Error in dev-session disconnect:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect dev session' },
      { status: 500 }
    );
  }
}
