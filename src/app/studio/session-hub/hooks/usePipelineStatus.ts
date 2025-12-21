'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  ChadStatus,
  JenStatus,
  SusanStatus,
  BucketCounts,
  Session,
  PipelineHealth,
} from '../types';

// ALL data comes from DATABASE - no HTTP calls to workers
// Workers write TO database, dashboard reads FROM database

const defaultChadStatus: ChadStatus = {
  isRunning: false,
  queue: 0,
  processed: 0,
  lastActivity: null,
  error: null,
  sessionsCapured: 0,
  lastDumpTime: null,
  dumpIntervalMin: 10,
};

const defaultJenStatus: JenStatus = {
  isRunning: false,
  queue: 0,
  processed: 0,
  lastActivity: null,
  error: null,
  itemsFlagged: 0,
  currentlyProcessing: null,
};

const defaultSusanStatus: SusanStatus = {
  isRunning: false,
  queue: 0,
  processed: 0,
  lastActivity: null,
  error: null,
  itemsCategorized: 0,
  currentlyFiling: null,
};

const defaultBuckets: BucketCounts = {};

interface UsePipelineStatusOptions {
  chadPort?: number;
  isGlobal?: boolean;
}

// Pipeline: active → captured → flagged → pending → cleaned → archived
interface DatabaseStats {
  total_sessions: number;
  active: number;
  captured: number;
  flagged: number;
  pending: number;
  cleaned: number;
  archived: number;
  last_24h: number;
  last_2_days: number;
  last_session: string | null;
}

export function usePipelineStatus(options: UsePipelineStatusOptions = {}) {
  const [chadStatus, setChadStatus] = useState<ChadStatus>(defaultChadStatus);
  const [jenStatus, setJenStatus] = useState<JenStatus>(defaultJenStatus);
  const [susanStatus, setSusanStatus] = useState<SusanStatus>(defaultSusanStatus);
  const [buckets, setBuckets] = useState<BucketCounts>(defaultBuckets);
  const [previousBuckets, setPreviousBuckets] = useState<BucketCounts>(defaultBuckets);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState<PipelineHealth>({
    chad: 'idle',
    jen: 'idle',
    susan: 'idle',
    overall: 'healthy',
  });

  const bucketHistoryRef = useRef<BucketCounts[]>([]);

  // Calculate total pending items
  const totalPending = Object.values(buckets).reduce((sum, count) => sum + count, 0);

  // Fetch ALL data from database and derive worker status
  const fetchFromDatabase = useCallback(async () => {
    try {
      // Fetch buckets (status counts) and sessions in parallel
      const [bucketsRes, sessionsRes] = await Promise.all([
        fetch('/api/ai-sessions/buckets', { cache: 'no-store' }),
        fetch('/api/ai-sessions?limit=50', { cache: 'no-store' }),
      ]);

      if (!bucketsRes.ok || !sessionsRes.ok) {
        throw new Error('Database fetch failed');
      }

      const bucketsData = await bucketsRes.json();
      const sessionsData = await sessionsRes.json();

      if (bucketsData.success && bucketsData.buckets) {
        const newBuckets: BucketCounts = bucketsData.buckets;
        const stats: DatabaseStats = bucketsData.stats || {};

        // Store previous for delta calculation
        setPreviousBuckets(buckets);
        setBuckets(newBuckets);

        // Track history (keep last 10)
        bucketHistoryRef.current = [...bucketHistoryRef.current.slice(-9), newBuckets];

        // Derive Chad status from database
        // Chad captures sessions - look at total captured + active
        const chadCaptured = (stats.captured || 0) + (stats.active || 0);
        const lastSession = stats.last_session;
        const hasRecentActivity = lastSession &&
          (Date.now() - new Date(lastSession).getTime()) < 30 * 60 * 1000; // 30 min

        setChadStatus({
          isRunning: hasRecentActivity || false,
          queue: stats.active || 0,
          processed: stats.total_sessions || 0,
          lastActivity: lastSession,
          error: null,
          sessionsCapured: chadCaptured,
          lastDumpTime: lastSession,
          dumpIntervalMin: 10,
        });

        // Derive Jen status from database
        // Jen scrubs captured sessions -> queue is captured, processed moves to flagged
        const jenQueue = stats.captured || 0;
        const jenProcessed = stats.flagged || 0;

        setJenStatus({
          isRunning: jenQueue > 0,
          queue: jenQueue,
          processed: jenProcessed,
          lastActivity: lastSession,
          error: null,
          itemsFlagged: stats.flagged || 0,
          currentlyProcessing: jenQueue > 0 ? 'Processing...' : null,
        });

        // Derive Susan status from database
        // Susan files flagged sessions -> queue is flagged, processed is pending + cleaned + archived
        const susanQueue = stats.flagged || 0;
        const susanProcessed = (stats.pending || 0) + (stats.cleaned || 0) + (stats.archived || 0);

        setSusanStatus({
          isRunning: susanQueue > 0,
          queue: susanQueue,
          processed: susanProcessed,
          lastActivity: lastSession,
          error: null,
          itemsCategorized: susanProcessed,
          currentlyFiling: susanQueue > 0 ? 'Filing...' : null,
        });
      }

      if (sessionsData.success && sessionsData.sessions) {
        setSessions(sessionsData.sessions);
      }

    } catch (error) {
      console.error('Failed to fetch from database:', error);
      // Set error state on all workers
      const errorMsg = error instanceof Error ? error.message : 'Database connection failed';
      setChadStatus(prev => ({ ...prev, error: errorMsg, isRunning: false }));
      setJenStatus(prev => ({ ...prev, error: errorMsg, isRunning: false }));
      setSusanStatus(prev => ({ ...prev, error: errorMsg, isRunning: false }));
    }
  }, [buckets]);

  // Calculate pipeline health based on database status
  const calculateHealth = useCallback(() => {
    const now = Date.now();
    const TEN_MINUTES = 10 * 60 * 1000;
    const THIRTY_MINUTES = 30 * 60 * 1000;

    // Chad health - based on last activity
    let chadHealth: PipelineHealth['chad'] = 'idle';
    if (chadStatus.error) {
      chadHealth = 'error';
    } else if (chadStatus.lastActivity) {
      const lastActive = new Date(chadStatus.lastActivity).getTime();
      if ((now - lastActive) < TEN_MINUTES) {
        chadHealth = 'healthy';
      } else if ((now - lastActive) > THIRTY_MINUTES) {
        chadHealth = 'stuck';
      }
    }

    // Jen health - based on queue
    let jenHealth: PipelineHealth['jen'] = 'idle';
    if (jenStatus.error) {
      jenHealth = 'error';
    } else if (jenStatus.queue > 0) {
      jenHealth = 'healthy'; // Has work to do
    }

    // Susan health - based on queue
    let susanHealth: PipelineHealth['susan'] = 'idle';
    if (susanStatus.error) {
      susanHealth = 'error';
    } else if (susanStatus.queue > 0) {
      susanHealth = 'healthy'; // Has work to do
    }

    // Overall health
    let overall: PipelineHealth['overall'] = 'healthy';
    if (chadHealth === 'error' || jenHealth === 'error' || susanHealth === 'error') {
      overall = 'down';
    } else if (chadHealth === 'stuck') {
      overall = 'degraded';
    }

    setHealth({ chad: chadHealth, jen: jenHealth, susan: susanHealth, overall });
  }, [chadStatus, jenStatus, susanStatus]);

  // Refresh all data from database
  const refreshAll = useCallback(async () => {
    setLoading(true);
    await fetchFromDatabase();
    calculateHealth();
    setLoading(false);
  }, [fetchFromDatabase, calculateHealth]);

  // Trigger is no longer supported - workers run on their own schedule
  const triggerTeamMember = useCallback(async (member: 'chad' | 'jen' | 'susan') => {
    console.log(`Trigger not supported - ${member} runs on database polling schedule`);
    // Just refresh to show latest data
    await refreshAll();
  }, [refreshAll]);

  // Calculate bucket delta
  const bucketDelta = useCallback(() => {
    const prevTotal = Object.values(previousBuckets).reduce((sum, c) => sum + c, 0);
    const currTotal = Object.values(buckets).reduce((sum, c) => sum + c, 0);
    return currTotal - prevTotal;
  }, [buckets, previousBuckets]);

  // Initial fetch
  useEffect(() => {
    refreshAll();
  }, []);

  // Poll every 5 seconds
  useEffect(() => {
    const interval = setInterval(refreshAll, 5000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  // Recalculate health when statuses change
  useEffect(() => {
    calculateHealth();
  }, [chadStatus, jenStatus, susanStatus, calculateHealth]);

  return {
    chadStatus,
    jenStatus,
    susanStatus,
    buckets,
    previousBuckets,
    sessions,
    health,
    totalPending,
    bucketDelta: bucketDelta(),
    loading,
    triggerTeamMember,
    refreshAll,
  };
}
