'use client';

import { useState, useEffect, useRef } from 'react';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source?: string;
}


type WorkerType = 'main' | 'w1' | 'w2' | 'w3' | 'w4';

interface LiveFeedPanelProps {
  tradeline: string;
  activeWorker: WorkerType;
}


interface WorkerLogs {
  main: LogEntry[];
  w1: LogEntry[];
  w2: LogEntry[];
  w3: LogEntry[];
  w4: LogEntry[];
}



export default function LiveFeedPanel({ tradeline, activeWorker }: LiveFeedPanelProps) {
  const [workerLogs, setWorkerLogs] = useState<WorkerLogs>({
    main: [],
    w1: [],
    w2: [],
    w3: [],
    w4: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch all 5 workers in one batch call
  const fetchAllLogs = async () => {
    try {
      const res = await fetch(`/api/tradelines/logs/${tradeline}?lines=50&workers=all`);
      const data = await res.json();

      if (data.success && data.workers) {
        const parsed: WorkerLogs = {
          main: parseLogLines(data.workers.main?.logs || ''),
          w1: parseLogLines(data.workers.w1?.logs || ''),
          w2: parseLogLines(data.workers.w2?.logs || ''),
          w3: parseLogLines(data.workers.w3?.logs || ''),
          w4: parseLogLines(data.workers.w4?.logs || ''),
        };
        setWorkerLogs(parsed);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch logs');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Parse PM2 log format with ANSI codes
  const parseLogLines = (logText: string): LogEntry[] => {
    if (!logText) return [];

    // Strip ANSI color codes
    const cleanText = logText.replace(/\u001b\[[0-9;]*m/g, '');

    const lines = cleanText.split('\n').filter(Boolean);
    return lines.map((line, i) => {
      // Parse format: [timestamp] [LEVEL] message | {json}
      const match = line.match(/\[([^\]]+)\]\s*\[(\w+)\]\s*(.+)/);

      if (match) {
        const [, timestamp, level, rest] = match;
        const [message, jsonPart] = rest.split(' | ');
        let source = undefined;
        if (jsonPart) {
          try {
            const meta = JSON.parse(jsonPart);
            source = meta.module || meta.source;
          } catch {
            // ignore parse errors
          }
        }

        return {
          id: `${i}-${timestamp}`,
          timestamp,
          level: level.toLowerCase() as LogEntry['level'],
          message: message.trim(),
          source,
        };
      }

      return {
        id: `${i}-${Date.now()}`,
        timestamp: new Date().toISOString(),
        level: 'info' as const,
        message: line,
      };
    });
  };

  // Initial fetch when tradeline changes
  useEffect(() => {
    setLoading(true);
    setWorkerLogs({ main: [], w1: [], w2: [], w3: [], w4: [] });
    fetchAllLogs();
  }, [tradeline]);

  // Auto-refresh every 5 seconds when not paused
  useEffect(() => {
    if (paused) return;

    const interval = setInterval(fetchAllLogs, 5000);
    return () => clearInterval(interval);
  }, [tradeline, paused]);

  // Auto-scroll to bottom when logs change for active worker
  useEffect(() => {
    if (!paused && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [workerLogs, activeWorker, paused]);

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return timestamp;
    }
  };

  const levelBadges = {
    info: 'bg-blue-500/20 text-blue-400',
    warn: 'bg-yellow-500/20 text-yellow-400',
    error: 'bg-red-500/20 text-red-400',
    debug: 'bg-gray-500/20 text-gray-400',
  };

  // Get logs for the currently active worker
  const currentLogs = workerLogs[activeWorker];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-gray-800/50">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${!error ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-xs text-gray-400">{!error ? 'Live (5s)' : 'Error'}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPaused(!paused)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              paused
                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
            }`}
          >
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={fetchAllLogs}
            className="px-2 py-1 text-xs bg-gray-700 text-gray-400 rounded hover:bg-gray-600 hover:text-white transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Logs */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1 bg-gray-900/50"
      >
        {loading ? (
          <div className="text-gray-500 text-center py-8">Loading logs...</div>
        ) : error ? (
          <div className="text-red-400 text-center py-8">Error: {error}</div>
        ) : currentLogs.length === 0 ? (
          <div className="text-gray-500 text-center py-8">No logs available</div>
        ) : (
          currentLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-2 py-0.5 hover:bg-gray-800/50 px-1 rounded">
              <span className="text-gray-600 flex-shrink-0">{formatTime(log.timestamp)}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase flex-shrink-0 ${levelBadges[log.level] || levelBadges.info}`}>
                {log.level}
              </span>
              {log.source && (
                <span className="text-purple-400 flex-shrink-0">[{log.source}]</span>
              )}
              <span className="text-gray-300">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
