/**
 * User Context API - PROXY TO OPS-9600
 *
 * Dashboard is a signal emitter, not a decision maker.
 * ops-9600 is the ONLY context write gateway.
 *
 * GET  /api/context         - Proxy to ops-9600/v1/context/current
 * POST /api/context         - Proxy to ops-9600/v1/context/commit
 * DELETE /api/context       - End current context
 */

import { NextRequest, NextResponse } from 'next/server';

const OPS_9600_URL = process.env.OPS_9600_URL || 'http://161.35.229.220:9600';

export type ContextMode = 'worklog' | 'forge' | 'support' | 'planning' | 'other' | 'break';

export interface UserContext {
  id: string;
  user_id: string;
  pc_tag: string;
  pc_tag_raw: string | null;
  mode: ContextMode;
  project_id: string | null;
  project_slug: string | null;
  project_name: string | null;
  dev_team: string | null;
  started_at: string;
  updated_at: string;
  ended_at: string | null;
  source: string;
  locked: boolean;
  event_type: 'flip' | 'heartbeat';
  meta: Record<string, unknown> | null;
}

/**
 * GET /api/context
 * Proxy to ops-9600/v1/context/current
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const pcTag = searchParams.get('pc_tag') || 'studio-terminals';

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'user_id required' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${OPS_9600_URL}/v1/context/current?user_id=${userId}&pc_tag=${pcTag}`,
      { cache: 'no-store' }
    );

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Context API] GET proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get context from ops-9600' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/context
 * Proxy to ops-9600/v1/context/commit
 *
 * Dashboard sends signal, ops-9600 decides canonical result.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      user_id,
      mode,
      project_slug,
      about_project_slug,  // For forge: what project user was thinking about
      meta
    } = body;

    if (!user_id) {
      return NextResponse.json(
        { success: false, error: 'user_id required' },
        { status: 400 }
      );
    }

    // Proxy to ops-9600 - let it decide canonical mode/project
    const response = await fetch(`${OPS_9600_URL}/v1/context/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id,
        pc_tag_raw: 'dashboard-5500',
        requested_project_slug: project_slug,
        requested_mode: mode,
        pathname: meta?.route || null
      })
    });

    const data = await response.json();

    // Build toast message for UI
    let toastMessage = `Context → ${data.context?.mode || mode}`;
    if (data.context?.project_name) {
      toastMessage = `Context → ${data.context.project_name}`;
    }

    return NextResponse.json({
      ...data,
      toast: toastMessage
    });
  } catch (error) {
    console.error('[Context API] POST proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to commit context to ops-9600' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/context
 * End current context - still direct DB for now (could proxy later)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'user_id required' },
        { status: 400 }
      );
    }

    // For DELETE, we'll still use direct DB until 9600 has this endpoint
    // TODO: Add DELETE endpoint to ops-9600
    const { db } = await import('@/lib/db');

    const result = await db.query<UserContext>(
      `UPDATE dev_user_context
       SET ended_at = NOW(), updated_at = NOW()
       WHERE user_id = $1 AND pc_tag_norm = 'studio-terminals' AND ended_at IS NULL
       RETURNING *`,
      [userId]
    );

    const endRows = Array.isArray(result.data) ? result.data : [];
    const endedContext = endRows[0];

    return NextResponse.json({
      success: true,
      endedContext,
      message: endedContext ? 'Context ended' : 'No active context to end',
    });
  } catch (error) {
    console.error('[Context API] DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to end context' },
      { status: 500 }
    );
  }
}
