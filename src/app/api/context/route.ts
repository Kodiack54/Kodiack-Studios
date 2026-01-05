/**
 * User Context API
 *
 * GLOBAL SOURCE OF TRUTH for what the user is doing.
 * UI is the event source. Every navigation fires a context update.
 *
 * GET  /api/context         - Get current active context for user/pc_tag
 * POST /api/context         - Set/flip context (creates new, ends previous)
 * DELETE /api/context       - End current context (clock out, logout)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export type ContextMode = 'project' | 'forge' | 'support' | 'planning' | 'other' | 'break';
export type ContextSource = 'universal' | 'studio' | 'autoflip' | 'timeclock' | 'manual';

export interface UserContext {
  id: string;
  user_id: string;
  pc_tag: string;
  mode: ContextMode;
  project_id: string | null;
  project_slug: string | null;
  project_name: string | null;
  dev_team: string | null;
  started_at: string;
  updated_at: string;
  ended_at: string | null;
  source: ContextSource;
  locked: boolean;
}

interface ContextSetRequest {
  user_id: string;
  pc_tag: string;
  mode: ContextMode;
  project_id?: string | null;
  project_slug?: string | null;
  project_name?: string | null;
  dev_team?: string | null;
  source: ContextSource;
}

/**
 * GET /api/context
 * Get active context for user/pc_tag
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const pcTag = searchParams.get('pc_tag');

    if (!userId || !pcTag) {
      return NextResponse.json(
        { success: false, error: 'user_id and pc_tag required' },
        { status: 400 }
      );
    }

    // Find active context (ended_at IS NULL)
    const result = await db.query<UserContext>(
      `SELECT * FROM dev_user_context
       WHERE user_id = $1 AND pc_tag = $2 AND ended_at IS NULL
       ORDER BY started_at DESC LIMIT 1`,
      [userId, pcTag]
    );

    const rows = Array.isArray(result.data) ? result.data : [];
    const context = rows[0] || null;

    return NextResponse.json({
      success: true,
      context,
      hasActiveContext: !!context,
    });
  } catch (error) {
    console.error('[Context API] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get context' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/context
 * Set or flip context. Ends any existing active context first.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ContextSetRequest;

    const { user_id, pc_tag, mode, project_id, project_slug, project_name, dev_team, source } = body;

    // Validate required fields
    if (!user_id || !pc_tag || !mode || !source) {
      return NextResponse.json(
        { success: false, error: 'user_id, pc_tag, mode, and source required' },
        { status: 400 }
      );
    }

    // Validate mode
    const validModes: ContextMode[] = ['project', 'forge', 'support', 'planning', 'other', 'break'];
    if (!validModes.includes(mode)) {
      return NextResponse.json(
        { success: false, error: `Invalid mode. Must be one of: ${validModes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate: project mode requires project_id
    if (mode === 'project' && !project_id) {
      return NextResponse.json(
        { success: false, error: 'project_id required when mode=project' },
        { status: 400 }
      );
    }

    // Validate: non-project modes must NOT have project_id
    if (mode !== 'project' && project_id) {
      return NextResponse.json(
        { success: false, error: `project_id must be null when mode=${mode}` },
        { status: 400 }
      );
    }

    // 1. End any existing active context for this user/pc_tag
    await db.query(
      `UPDATE dev_user_context
       SET ended_at = NOW(), updated_at = NOW()
       WHERE user_id = $1 AND pc_tag = $2 AND ended_at IS NULL`,
      [user_id, pc_tag]
    );

    // 2. Create new context
    const insertResult = await db.query<UserContext>(
      `INSERT INTO dev_user_context
       (user_id, pc_tag, mode, project_id, project_slug, project_name, dev_team, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        user_id,
        pc_tag,
        mode,
        mode === 'project' ? project_id : null,
        mode === 'project' ? (project_slug || null) : null,
        mode === 'project' ? (project_name || null) : null,
        dev_team || null,
        source,
      ]
    );

    const insertRows = Array.isArray(insertResult.data) ? insertResult.data : [];
    const newContext = insertRows[0];

    if (!newContext) {
      return NextResponse.json(
        { success: false, error: 'Failed to create context' },
        { status: 500 }
      );
    }

    // Build toast message
    let toastMessage = `Context → ${mode.charAt(0).toUpperCase() + mode.slice(1)}`;
    if (mode === 'project' && (project_name || project_slug)) {
      toastMessage = `Context → ${project_name || project_slug}`;
      if (dev_team) {
        toastMessage += ` (${dev_team})`;
      }
    }

    return NextResponse.json({
      success: true,
      context: newContext,
      toast: toastMessage,
    });
  } catch (error) {
    console.error('[Context API] POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to set context' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/context
 * End current context (clock out, logout, explicit end)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const pcTag = searchParams.get('pc_tag');

    if (!userId || !pcTag) {
      return NextResponse.json(
        { success: false, error: 'user_id and pc_tag required' },
        { status: 400 }
      );
    }

    // End active context
    const result = await db.query<UserContext>(
      `UPDATE dev_user_context
       SET ended_at = NOW(), updated_at = NOW()
       WHERE user_id = $1 AND pc_tag = $2 AND ended_at IS NULL
       RETURNING *`,
      [userId, pcTag]
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
