'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  ChadStatus,
  JenStatus,
  SusanStatus,
  BucketCounts,
  Session,
  PipelineHealth,
  PipelineMetrics
} from '../types';

// Service URLs - using the dev droplet (Global AI Team ports: 5400-5407)
const DEV_DROPLET = '161.35.229.220';

// Helper to get team URLs based on Chad port
// Chad = base+1, Jen = base+2, Susan = base+3
function getTeamUrls(chadPort?: number) {
  const basePort = chadPort ? chadPort - 1 : 5400; // e.g., 5411 -> base 5410
  return {
    chad: `http://${DEV_DROPLET}:${basePort + 1}`,
    jen: `http://${DEV_DROPLET}:${basePort + 2}`,
    susan: `http://${DEV_DROPLET}:${basePort + 3}`,
  };
}

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

// Dynamic buckets - starts empty, populated from Susan
const defaultBuckets: BucketCounts = {};

interface UsePipelineStatusOptions {
  chadPort?: number; // Specific Chad port (e.g., 5411 for Dev 1)
  isGlobal?: boolean; // If true, fetch from all 3 Chads
}

export function usePipelineStatus(options: UsePipelineStatusOptions = {}) {
  const { chadPort, isGlobal = false } = options;

  // Get team-specific URLs based on chadPort
  const teamUrls = getTeamUrls(chadPort);
  const activeChadUrl = teamUrls.chad;
  const activeJenUrl = teamUrls.jen;
  const activeSusanUrl = teamUrls.susan;
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

  // Track bucket history for trend detection
  const bucketHistoryRef = useRef<BucketCounts[]>([]);

  // Calculate total pending items
  const totalPending = Object.values(buckets).reduce((sum, count) => sum + count, 0);

  // Fetch Chad status
  const fetchChadStatus = useCallback(async () => {
    try {
      const res = await fetch(`${activeChadUrl}/api/status`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setChadStatus({
        isRunning: data.isRunning ?? false,
        queue: data.pendingCount ?? 0,
        processed: data.processedCount ?? 0,
        lastActivity: data.lastActivity ?? null,
        error: null,
        sessionsCapured: data.sessionsCapured ?? data.sessionCount ?? 0,
        lastDumpTime: data.lastDumpTime ?? null,
        dumpIntervalMin: data.dumpIntervalMin ?? 10,
      });
    } catch (error) {
      setChadStatus(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Connection failed',
        isRunning: false,
      }));
    }
  }, [activeChadUrl]);

  // Fetch Jen status
  const fetchJenStatus = useCallback(async () => {
    try {
      const res = await fetch(`${activeJenUrl}/api/status`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setJenStatus({
        isRunning: data.isRunning ?? false,
        queue: data.pendingCount ?? 0,
        processed: data.processedCount ?? 0,
        lastActivity: data.lastActivity ?? null,
        error: null,
        itemsFlagged: data.itemsFlagged ?? 0,
        currentlyProcessing: data.currentlyProcessing ?? null,
      });
    } catch (error) {
      setJenStatus(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Connection failed',
        isRunning: false,
      }));
    }
  }, [activeJenUrl]);

  // Fetch Susan status
  const fetchSusanStatus = useCallback(async () => {
    try {
      const res = await fetch(`${activeSusanUrl}/api/status`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setSusanStatus({
        isRunning: data.isRunning ?? false,
        queue: data.pendingCount ?? 0,
        processed: data.processedCount ?? 0,
        lastActivity: data.lastActivity ?? null,
        error: null,
        itemsCategorized: data.itemsCategorized ?? 0,
        currentlyFiling: data.currentlyFiling ?? null,
      });
    } catch (error) {
      setSusanStatus(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Connection failed',
        isRunning: false,
      }));
    }
  }, [activeSusanUrl]);

  // Fetch bucket counts from Jen - she flags items INTO these buckets
  // Susan then files items OUT of these buckets (decreasing counts)
  const fetchBuckets = useCallback(async () => {
    try {
      const res = await fetch(`${activeJenUrl}/api/buckets`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.success || data.buckets || data.categories || data.flags) {
        // Accept buckets from various response formats
        const rawBuckets = data.buckets || data.categories || data.flags || data;

        // Convert to our format - handle both array and object formats
        let newBuckets: BucketCounts = {};

        if (Array.isArray(rawBuckets)) {
          // Array format: [{ name: 'Work Log', count: 51 }, ...]
          rawBuckets.forEach((b: { name?: string; category?: string; flag?: string; count?: number; value?: number }) => {
            const name = b.name || b.category || b.flag || 'Unknown';
            newBuckets[name] = b.count ?? b.value ?? 0;
          });
        } else if (typeof rawBuckets === 'object') {
          // Object format: { 'Work Log': 51, 'Ideas': 17, ... }
          newBuckets = { ...rawBuckets };
        }

        // Store previous for delta calculation
        setPreviousBuckets(buckets);
        setBuckets(newBuckets);

        // Track history (keep last 10)
        bucketHistoryRef.current = [...bucketHistoryRef.current.slice(-9), newBuckets];
      }
    } catch (error) {
      console.error('Failed to fetch buckets:', error);
    }
  }, [buckets, activeJenUrl]);

  // Fetch recent sessions from Chad
  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(`${activeChadUrl}/api/sessions/recent`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.success || data.sessions) {
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  }, [activeChadUrl]);

  // Calculate pipeline health
  const calculateHealth = useCallback(() => {
    const now = Date.now();
    const TEN_MINUTES = 10 * 60 * 1000;
    const THIRTY_MINUTES = 30 * 60 * 1000;

    // Chad health - should have activity within dump interval
    let chadHealth: PipelineHealth['chad'] = 'idle';
    if (chadStatus.error) {
      chadHealth = 'error';
    } else if (chadStatus.isRunning) {
      chadHealth = 'healthy';
    } else if (chadStatus.lastActivity) {
      const lastActive = new Date(chadStatus.lastActivity).getTime();
      chadHealth = (now - lastActive) > THIRTY_MINUTES ? 'stuck' : 'idle';
    }

    // Jen health - should be processing if queue has items
    let jenHealth: PipelineHealth['jen'] = 'idle';
    if (jenStatus.error) {
      jenHealth = 'error';
    } else if (jenStatus.isRunning) {
      jenHealth = 'healthy';
    } else if (jenStatus.queue > 0) {
      // Has items but not running - might be stuck
      if (jenStatus.lastActivity) {
        const lastActive = new Date(jenStatus.lastActivity).getTime();
        jenHealth = (now - lastActive) > TEN_MINUTES ? 'stuck' : 'idle';
      } else {
        jenHealth = 'stuck';
      }
    }

    // Susan health - should be categorizing if buckets have items
    let susanHealth: PipelineHealth['susan'] = 'idle';
    if (susanStatus.error) {
      susanHealth = 'error';
    } else if (susanStatus.isRunning) {
      susanHealth = 'healthy';
    } else if (totalPending > 0) {
      // Has pending items but not running
      if (susanStatus.lastActivity) {
        const lastActive = new Date(susanStatus.lastActivity).getTime();
        susanHealth = (now - lastActive) > TEN_MINUTES ? 'stuck' : 'idle';
      } else {
        susanHealth = 'stuck';
      }
    }

    // Overall health
    let overall: PipelineHealth['overall'] = 'healthy';
    if (chadHealth === 'error' || jenHealth === 'error' || susanHealth === 'error') {
      overall = 'down';
    } else if (chadHealth === 'stuck' || jenHealth === 'stuck' || susanHealth === 'stuck') {
      overall = 'degraded';
    }

    setHealth({ chad: chadHealth, jen: jenHealth, susan: susanHealth, overall });
  }, [chadStatus, jenStatus, susanStatus, totalPending]);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchChadStatus(),
      fetchJenStatus(),
      fetchSusanStatus(),
      fetchBuckets(),
      fetchSessions(),
    ]);
    calculateHealth();
    setLoading(false);
  }, [fetchChadStatus, fetchJenStatus, fetchSusanStatus, fetchBuckets, fetchSessions, calculateHealth]);

  // Trigger a specific team member
  const triggerTeamMember = useCallback(async (member: 'chad' | 'jen' | 'susan') => {
    const urls: Record<string, string> = {
      chad: activeChadUrl,
      jen: activeJenUrl,
      susan: activeSusanUrl,
    };

    try {
      const res = await fetch(`${urls[member]}/api/trigger`, { method: 'POST' });
      const data = await res.json();
      if (!data.success) {
        console.error(`Failed to trigger ${member}:`, data.error);
      }
      // Refresh after trigger
      setTimeout(refreshAll, 1000);
    } catch (error) {
      console.error(`Failed to trigger ${member}:`, error);
    }
  }, [refreshAll, activeChadUrl, activeJenUrl, activeSusanUrl]);

  // Calculate bucket delta (positive = Jen adding, negative = Susan removing)
  const bucketDelta = useCallback(() => {
    const prevTotal = Object.values(previousBuckets).reduce((sum, c) => sum + c, 0);
    const currTotal = Object.values(buckets).reduce((sum, c) => sum + c, 0);
    return currTotal - prevTotal;
  }, [buckets, previousBuckets]);

  // Initial fetch
  useEffect(() => {
    refreshAll();
  }, []);

  // Poll every 5 seconds for real-time updates
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
