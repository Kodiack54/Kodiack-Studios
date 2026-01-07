/**
 * Operations Stats Logic
 * Today's pipeline counters from database
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { PipelineStats, StatsResponse } from '../lib/types';

/**
 * Get today's pipeline statistics
 */
export async function getPipelineStats(): Promise<PipelineStats> {
  const stats: PipelineStats = {
    flips: 0,
    heartbeats: 0,
    transcripts: 0,
    sessions: 0,
    worklogs: 0,
    todos: 0,
    bugs: 0,
    knowledge: 0,
  };

  try {
    // Run all count queries in parallel
    const [
      flipsResult,
      heartbeatsResult,
      transcriptsResult,
      sessionsResult,
      worklogsResult,
      todosResult,
      bugsResult,
      knowledgeResult,
    ] = await Promise.all([
      // Flips today
      db.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM dev_user_context
         WHERE event_type = 'flip' AND started_at > NOW() - INTERVAL '1 day'`
      ),
      // Heartbeats today
      db.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM dev_user_context
         WHERE event_type = 'heartbeat' AND started_at > NOW() - INTERVAL '1 day'`
      ),
      // Transcript dumps today
      db.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM ai_transcripts
         WHERE created_at > NOW() - INTERVAL '1 day'`
      ),
      // Sessions created today
      db.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM ai_sessions
         WHERE created_at > NOW() - INTERVAL '1 day'`
      ),
      // Worklogs created today
      db.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM dev_worklogs
         WHERE created_at > NOW() - INTERVAL '1 day'`
      ),
      // Todos created today
      db.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM ai_extracted_todos
         WHERE created_at > NOW() - INTERVAL '1 day'`
      ),
      // Bugs created today
      db.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM ai_extracted_bugs
         WHERE created_at > NOW() - INTERVAL '1 day'`
      ),
      // Knowledge items created today
      db.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM ai_knowledge
         WHERE created_at > NOW() - INTERVAL '1 day'`
      ),
    ]);

    // Extract counts from results - db.query returns QueryResult where data could be T | T[] | null
    const getCount = (result: Awaited<ReturnType<typeof db.query<{ count: string }>>>): number => {
      if (!result.data) return 0;
      // db.query always returns array for data
      const rows = Array.isArray(result.data) ? result.data : [result.data];
      return parseInt(rows[0]?.count || '0', 10);
    };

    stats.flips = getCount(flipsResult);
    stats.heartbeats = getCount(heartbeatsResult);
    stats.transcripts = getCount(transcriptsResult);
    stats.sessions = getCount(sessionsResult);
    stats.worklogs = getCount(worklogsResult);
    stats.todos = getCount(todosResult);
    stats.bugs = getCount(bugsResult);
    stats.knowledge = getCount(knowledgeResult);
  } catch (error) {
    console.error('[Operations Stats] Error fetching stats:', error);
    // Return zeros on error
  }

  return stats;
}

/**
 * GET handler for Next.js API route wrapper
 */
export async function getOperationsStats(): Promise<NextResponse> {
  try {
    const stats = await getPipelineStats();
    const response: StatsResponse = {
      success: true,
      stats,
      timestamp: Date.now(),
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error('[Operations Stats] Error:', error);
    return NextResponse.json(
      { success: false, stats: null, timestamp: Date.now(), error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
