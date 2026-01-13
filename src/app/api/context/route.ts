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

export type ContextMode = 'worklog' | 'forge' | 'support' | 'planning' | 'other' | 'break';
export type ContextSource = 'universal' | 'studio' | 'autoflip' | 'timeclock' | 'manual';
// The Forge guardrail - prevents forge MODE from overwriting project to the-forge PROJECT
const THE_FORGE_ID = '00000000-0000-0000-0000-000000f09e01';
const THE_FORGE_SLUG = 'the-forge';


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

    // Find active context using normalized pc_tag
    const result = await db.query<UserContext>(
      `SELECT * FROM dev_user_context
       WHERE user_id = $1 AND pc_tag_norm = normalize_pc_tag($2) AND ended_at IS NULL
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
    const validModes: ContextMode[] = ['worklog', 'forge', 'support', 'planning', 'other', 'break'];
    if (!validModes.includes(mode)) {
      return NextResponse.json(
        { success: false, error: `Invalid mode. Must be one of: ${validModes.join(', ')}` },
        { status: 400 }
      );
    }

    // Context Contract v1.0: Project is sticky, mode is fluid
    // - project_id can be set for ANY mode (planning/support/forge all track effective project)
    // - worklog mode requires project_id (can't be "worklog mode" without a project)
    // - support/planning/forge can have project_id (sticky project or Studios Platform)
    if (mode === 'worklog' && !project_id) {
      return NextResponse.json(
        { success: false, error: 'project_id required when mode=worklog' },
        { status: 400 }
      );
    }
    // Note: non-project modes CAN have project_id (effective project stays)
    // GUARDRAIL: Forge is a MODE, not a project
    // If mode=forge and project is the-forge, preserve existing project instead
    let guardrail_applied = false;
    let effective_project_id = project_id;
    let effective_project_slug = project_slug;
    let effective_project_name = project_name;

    if (mode === 'forge' && (project_id === THE_FORGE_ID || project_slug === THE_FORGE_SLUG)) {
      // Get current context to preserve existing project
      const currentCtx = await db.query<UserContext>(
        `SELECT project_id, project_slug, project_name FROM dev_user_context
         WHERE user_id = $1 AND pc_tag_norm = normalize_pc_tag($2) AND ended_at IS NULL
         ORDER BY started_at DESC LIMIT 1`,
        [user_id, pc_tag]
      );
      const currentRows = Array.isArray(currentCtx.data) ? currentCtx.data : [];
      const existing = currentRows[0];

      if (existing?.project_id) {
        effective_project_id = existing.project_id;
        effective_project_slug = existing.project_slug;
        effective_project_name = existing.project_name;
        guardrail_applied = true;
        console.log('[Context API] GUARDRAIL: Blocked forge project override, keeping:', existing.project_slug);
      }
    }



    // ATOMIC context flip using CTE
    // Ensures only one open segment per (user_id, pc_tag_norm) at any time
    // Debounce: contexts < 2 min are deleted (noise), otherwise ended
    // $10 = event_type ('flip' or 'heartbeat')
    const insertResult = await db.query<UserContext>(
      `WITH
        current_ctx AS (
          SELECT id, started_at,
            EXTRACT(EPOCH FROM (NOW() - started_at)) as duration_secs
          FROM dev_user_context
          WHERE user_id = $1 AND pc_tag_norm = normalize_pc_tag($2) AND ended_at IS NULL
          ORDER BY started_at DESC LIMIT 1
        ),
        deleted_short AS (
          DELETE FROM dev_user_context
          WHERE $10 = 'flip' AND id = (SELECT id FROM current_ctx WHERE duration_secs < 120)
          RETURNING id
        ),
        closed_long AS (
          UPDATE dev_user_context
          SET ended_at = NOW(), updated_at = NOW()
          WHERE $10 = 'flip' AND id = (SELECT id FROM current_ctx WHERE duration_secs >= 120)
            AND id NOT IN (SELECT id FROM deleted_short)
          RETURNING id
        )
      INSERT INTO dev_user_context
        (user_id, pc_tag, pc_tag_norm, pc_tag_raw, mode, project_id, project_slug, project_name, dev_team, source, event_type, meta)
      VALUES ($1, $2, normalize_pc_tag($2), $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        user_id,
        pc_tag,
        pc_tag_raw || 'dashboard',
        mode,
        effective_project_id || null,
        effective_project_slug || null,
        effective_project_name || null,
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
          project_id: effective_project_id || null,
          project_slug: effective_project_slug || null,
          project_name: effective_project_name || null,
          pc_tag: pc_tag,  // Include for ops-9200 context resolution
          user_id: user_id,
          route: meta?.route || null,
        }),
      ]
    );

    // Build toast message (show "Project" for worklog mode in UI)
    let toastMessage = `Context → ${mode === 'worklog' ? 'Project' : mode.charAt(0).toUpperCase() + mode.slice(1)}`;
    if (mode === 'worklog' && (project_name || project_slug)) {
      toastMessage = `Context → ${project_name || project_slug}`;
      if (dev_team) {
        toastMessage += ` (${dev_team})`;
      }
    }

    return NextResponse.json({
      success: true,
      context: newContext,
      toast: toastMessage,
      guardrail_applied,
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

    // End active context using normalized pc_tag
    const result = await db.query<UserContext>(
      `UPDATE dev_user_context
       SET ended_at = NOW(), updated_at = NOW()
       WHERE user_id = $1 AND pc_tag_norm = normalize_pc_tag($2) AND ended_at IS NULL
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
