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
  pc_tag_raw: string | null;
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
  event_type: 'flip' | 'heartbeat';
  meta: Record<string, unknown> | null;
}

interface ContextSetRequest {
  user_id: string;
  pc_tag?: string;           // Optional - defaults to 'studio-terminals'
  pc_tag_raw?: string;       // Raw source identifier for forensics
  mode: ContextMode;
  project_id?: string | null;
  project_slug?: string | null;
  project_name?: string | null;
  dev_team?: string | null;
  source: ContextSource;
  event_type?: 'flip' | 'heartbeat';  // Defaults to 'flip'
  meta?: Record<string, unknown>;      // Arbitrary metadata (forge_scope, route, etc.)
}

/**
 * GET /api/context
 * Get active context for user/pc_tag
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    // Canonical pc_tag for all studio terminals
    const pcTag = 'studio-terminals';

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'user_id required' },
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

    const {
      user_id,
      mode,
      project_id,
      project_slug,
      project_name,
      dev_team,
      source,
      pc_tag_raw,
      event_type = 'flip',
      meta
    } = body;

    // Canonical pc_tag for all studio terminals
    // Chad normalizes terminal-5400/5410/mcp-session-log to this group
    const pc_tag = 'studio-terminals';

    // Validate required fields
    if (!user_id || !mode || !source) {
      return NextResponse.json(
        { success: false, error: 'user_id, mode, and source required' },
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

    // Context Contract v1.0: Project is sticky, mode is fluid
    // - project_id can be set for ANY mode (planning/support/forge all track effective project)
    // - project mode requires project_id (can't be "project mode" without a project)
    // - support/planning/forge can have project_id (sticky project or Studios Platform)
    if (mode === 'project' && !project_id) {
      return NextResponse.json(
        { success: false, error: 'project_id required when mode=project' },
        { status: 400 }
      );
    }
    // Note: non-project modes CAN have project_id (effective project stays)

    // Heartbeats are append-only - don't modify previous contexts
    // Flips use debounce logic to clean up short contexts
    if (event_type === 'flip') {
      // DEBOUNCE: Minimum 2-minute duration for context flips
      // If previous context was < 2 min, DELETE it (noise reduction)
      const MIN_DURATION_MS = 2 * 60 * 1000; // 2 minutes

      // 1. Get current active context to check its duration
      const currentResult = await db.query<UserContext>(
        `SELECT * FROM dev_user_context
         WHERE user_id = $1 AND pc_tag = $2 AND ended_at IS NULL
         ORDER BY started_at DESC LIMIT 1`,
        [user_id, pc_tag]
      );

      const currentRows = Array.isArray(currentResult.data) ? currentResult.data : [];
      const currentContext = currentRows[0];

      if (currentContext) {
        const duration = Date.now() - new Date(currentContext.started_at).getTime();

        if (duration < MIN_DURATION_MS) {
          // Context was too short - DELETE it (it's noise)
          await db.query(
            `DELETE FROM dev_user_context WHERE id = $1`,
            [currentContext.id]
          );
          console.log(`[Context API] Deleted short context (${Math.round(duration/1000)}s): ${currentContext.mode}`);
        } else {
          // Context was long enough - end it normally
          await db.query(
            `UPDATE dev_user_context
             SET ended_at = NOW(), updated_at = NOW()
             WHERE id = $1`,
            [currentContext.id]
          );
        }
      }
    }
    // For heartbeats: Just append, Chad uses latest event <= session_time

    // 2. Create new context (append-only for heartbeat support)
    const insertResult = await db.query<UserContext>(
      `INSERT INTO dev_user_context
       (user_id, pc_tag, pc_tag_raw, mode, project_id, project_slug, project_name, dev_team, source, event_type, meta)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        user_id,
        pc_tag,
        pc_tag_raw || 'dashboard',  // Default to 'dashboard' if not specified
        mode,
        project_id || null,        // Context Contract: project is sticky for ALL modes
        project_slug || null,      // planning/support/forge all track effective project
        project_name || null,
        dev_team || null,
        source,
        event_type,
        meta ? JSON.stringify(meta) : null,
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

    // Also log to dev_ops_events for Operations feed
    await db.query(
      `INSERT INTO dev_ops_events (service_id, event_type, trace_id, metadata)
       VALUES ($1, $2, $3, $4)`,
      [
        'dashboard-5500',
        event_type === 'flip' ? 'context_flip' : 'context_heartbeat',
        null,
        JSON.stringify({
          mode,
          project_id: project_id || null,
          project_slug: project_slug || null,
          project_name: project_name || null,
          pc_tag: pc_tag,  // Include for ops-9200 context resolution
          user_id: user_id,
        }),
      ]
    );

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

    // Canonical pc_tag for all studio terminals
    const pcTag = 'studio-terminals';

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'user_id required' },
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
