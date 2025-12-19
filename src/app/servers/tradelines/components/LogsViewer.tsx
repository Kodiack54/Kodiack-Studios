'use client';

import { useState, useEffect } from 'react';

interface LogsViewerProps {
  tradeline: string;
  onClose: () => void;
}

export default function LogsViewer({ tradeline, onClose }: LogsViewerProps) {
  const [logs, setLogs] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState(100);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchLogs = async () => {
    try {
      const res = await fetch(`/api/tradelines/logs/${tradeline}?lines=${lines}`);
      const result = await res.json();

      if (result.success) {
        setLogs(result.logs || 'No logs available');
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch logs');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [tradeline, lines]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, tradeline, lines]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-8">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-5xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Logs: {tradeline}
            </h3>
            <p className="text-xs text-gray-500">Showing last {lines} lines</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Lines selector */}
            <select
              value={lines}
              onChange={(e) => setLines(Number(e.target.value))}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm text-white"
            >
              <option value={50}>50 lines</option>
              <option value={100}>100 lines</option>
              <option value={200}>200 lines</option>
              <option value={500}>500 lines</option>
            </select>

            {/* Auto-refresh toggle */}
            <label className="flex items-center gap-2 text-sm text-gray-400">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded bg-gray-700 border-gray-600"
              />
              Auto-refresh
            </label>

            {/* Refresh button */}
            <button
              onClick={fetchLogs}
              className="px-3 py-1 text-xs font-semibold rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500 hover:text-white transition-colors"
            >
              Refresh
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors text-2xl leading-none"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              Loading logs...
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full text-red-400">
              Error: {error}
            </div>
          ) : (
            <pre className="font-mono text-xs text-gray-300 whitespace-pre-wrap">
              {logs}
            </pre>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-700 text-xs text-gray-500">
          <span>
            {autoRefresh ? 'Auto-refreshing every 5 seconds' : 'Manual refresh'}
          </span>
          <span>
            Press ESC to close
          </span>
        </div>
      </div>
    </div>
  );
}
