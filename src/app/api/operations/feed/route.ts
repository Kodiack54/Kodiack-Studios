/**
 * Operations Live Feed API
 * Returns real events from database for the Operations NOC feed
 */

import { NextResponse } from 'next/server';

// Database connection - using environment variables
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
  details?: Record<string, unknown>;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const since = searchParams.get('since'); // ISO timestamp
  const limit = parseInt(searchParams.get('limit') || '50');
  const serviceFilter = searchParams.get('service'); // Optional filter

  try {
    const { Pool } = await import('pg');
    const pool = new Pool(dbConfig);

    const events: FeedEvent[] = [];
    const sinceTime = since ? new Date(since) : new Date(Date.now() - 30 * 60 * 1000); // Default: last 30 min

    // Query 1: Context flips and heartbeats from dashboard-5500
    const contextQuery = `
      SELECT id, event_type, mode, project_slug, project_name, started_at
      FROM dev_user_context
      WHERE started_at > $1
      ORDER BY started_at DESC
      LIMIT $2
    `;
    const contextResult = await pool.query(contextQuery, [sinceTime.toISOString(), limit]);

    for (const row of contextResult.rows) {
      const projectName = row.project_slug || row.project_name || null;
      const mode = row.mode || 'unknown';

      // Build descriptive message based on mode and project
      let message: string;
      if (row.event_type === 'flip') {
        if (mode === 'project' && projectName) {
          message = `Context flip → ${projectName}`;
        } else if (mode === 'support') {
          message = `Context flip → Support Mode`;
        } else {
          message = `Context flip → ${mode}`;
        }
      } else {
        // Heartbeat
        if (mode === 'project' && projectName) {
          message = `Heartbeat: ${projectName}`;
        } else if (mode === 'support') {
          message = `Heartbeat: Support Mode`;
        } else {
          message = `Heartbeat: ${mode}`;
        }
      }

      events.push({
        id: row.id,
        serviceId: 'dashboard-5500',
        eventType: row.event_type === 'flip' ? 'context_flip' : 'context_heartbeat',
        message,
        timestamp: new Date(row.started_at).toISOString(),
        details: {
          mode,
          project: projectName,
        },
      });
    }

    // Query 2: Transcript dumps from PC and terminal to 9500
    const transcriptQuery = `
      SELECT id, source_type, pc_tag, project_slug, received_at
      FROM dev_transcripts_raw
      WHERE received_at > $1
      ORDER BY received_at DESC
      LIMIT $2
    `;
    const transcriptResult = await pool.query(transcriptQuery, [sinceTime.toISOString(), limit]);

    for (const row of transcriptResult.rows) {
      // Determine source service based on pc_tag
      let sourceService = 'user-pc';
      let eventType = 'pc_dump_sent';

      if (row.pc_tag === 'terminal-5400' || row.pc_tag?.includes('terminal')) {
        sourceService = 'terminal-5400';
        eventType = 'terminal_dump_sent';
      } else if (row.pc_tag?.startsWith('c--users-') || row.pc_tag?.includes('michael')) {
        sourceService = 'user-pc';
        eventType = 'pc_dump_sent';
      }

      // Source service sends dump
      events.push({
        id: `${row.id}-source`,
        serviceId: sourceService,
        eventType: eventType,
        message: `Dump sent → 9500 (${row.project_slug || 'unknown'})`,
        timestamp: new Date(row.received_at).toISOString(),
        details: {
          project: row.project_slug,
          pcTag: row.pc_tag,
        },
      });

      // 9500 receives the transcript
      events.push({
        id: `${row.id}-receipt`,
        serviceId: 'router-9500',
        eventType: 'transcript_received',
        message: `Transcript received from ${sourceService}: ${row.project_slug || 'unknown'}`,
        timestamp: new Date(row.received_at).toISOString(),
        details: {
          source: sourceService,
          project: row.project_slug,
          pcTag: row.pc_tag,
        },
      });
    }

    // Sort all events by timestamp descending
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply service filter if provided
    const filteredEvents = serviceFilter
      ? events.filter(e => e.serviceId === serviceFilter)
      : events;

    await pool.end();

    return NextResponse.json({
      success: true,
      events: filteredEvents.slice(0, limit),
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
