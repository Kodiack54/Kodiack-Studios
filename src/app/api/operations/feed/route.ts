/**
 * Operations Live Feed API
 * Reads ONLY from dev_ops_events - the canonical operations event stream
 */

import { NextResponse } from 'next/server';

const dbConfig = {
  host: process.env.PG_HOST || '161.35.229.220',
  port: parseInt(process.env.PG_PORT || '9432'),
  database: process.env.PG_DATABASE || 'kodiack_ai',
  user: process.env.PG_USER || 'kodiack_admin',
  password: process.env.PG_PASSWORD || 'K0d1ack_Pr0d_2025_Rx9',
};

interface FeedEvent {
  id: string;
  serviceId: string;
  eventType: string;
  message: string;
  timestamp: string;
  traceId?: string;
  details?: Record<string, unknown>;
}

// Event type to human message mapping
function getEventMessage(eventType: string, metadata: Record<string, unknown>): string {
  const traceShort = metadata?.trace_id ? ` [${String(metadata.trace_id).slice(-6)}]` : '';
  const mode = metadata?.mode || 'unknown';
  const project = metadata?.project_slug;
  const source = metadata?.source || 'unknown';

  // Format: "mode (project)" or just "mode" if no project
  const contextLabel = project ? `${mode} (${project})` : mode;

  switch (eventType) {
    // Transcript events - include mode/project and trace
    case 'pc_transcript_sent':
    case 'terminal_transcript_sent':
      return `Transcript sent → 9500: ${contextLabel}${traceShort}`;
    case 'transcript_received':
      return `Transcript received from ${source}: ${contextLabel}${traceShort}`;

    // All heartbeats - consistent format with mode/project
    case 'pc_heartbeat':
    case 'pc_sender_heartbeat':
    case 'external_claude_heartbeat':
    case 'terminal_heartbeat':
    case 'router_heartbeat':
    case 'dashboard_process_heartbeat':
    case 'context_heartbeat':
      return `Heartbeat: ${contextLabel}`;

    // Context flips
    case 'context_flip':
      return `Context flip → ${contextLabel}`;

    default:
      return eventType;
  }
}

// Event type to badge style
const eventTypeBadges: Record<string, string> = {
  pc_transcript_sent: 'SENT',
  terminal_transcript_sent: 'SENT',
  transcript_received: 'RECV',
  pc_sender_heartbeat: 'BEAT',
  terminal_heartbeat: 'BEAT',
  router_heartbeat: 'BEAT',
  context_flip: 'FLIP',
  context_heartbeat: 'BEAT',
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const since = searchParams.get('since');
  const limit = parseInt(searchParams.get('limit') || '100');
  const serviceFilter = searchParams.get('service');

  try {
    const { Pool } = await import('pg');
    const pool = new Pool(dbConfig);

    const sinceTime = since ? new Date(since) : new Date(Date.now() - 30 * 60 * 1000);

    // Query dev_ops_events - the ONE source of truth
    let query = `
      SELECT id, timestamp, service_id, event_type, trace_id, metadata
      FROM dev_ops_events
      WHERE timestamp > $1
    `;
    const params: (string | number)[] = [sinceTime.toISOString()];

    if (serviceFilter) {
      query += ` AND service_id = $2`;
      params.push(serviceFilter);
    }

    query += ` ORDER BY timestamp DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);

    const events: FeedEvent[] = result.rows.map(row => ({
      id: row.id,
      serviceId: row.service_id,
      eventType: row.event_type,
      message: getEventMessage(row.event_type, row.metadata || {}),
      timestamp: new Date(row.timestamp).toISOString(),
      traceId: row.trace_id,
      details: row.metadata,
    }));

    await pool.end();

    return NextResponse.json({
      success: true,
      events,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('[Operations Feed] Error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message, events: [] },
      { status: 500 }
    );
  }
}
