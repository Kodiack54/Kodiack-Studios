'use client';

import { useState } from 'react';

interface TradelineActionsProps {
  tradeline?: string;
  onSuccess?: () => void;
}

export default function TradelineActions({ tradeline, onSuccess }: TradelineActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (action: string) => {
    setLoading(action);
    setError(null);

    const endpoint = tradeline
      ? `/api/tradelines/${action}/${tradeline}`
      : `/api/tradelines/${action}`;

    try {
      const res = await fetch(endpoint, { method: 'POST' });
      const result = await res.json();

      if (!result.success) {
        setError(result.error || 'Action failed');
      } else {
        onSuccess?.();
        setTimeout(() => window.location.reload(), 2000);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(null);
    }
  };

  // Single tradeline actions
  if (tradeline) {
    return (
      <div className="flex gap-2">
        {error && (
          <span className="text-red-400 text-xs mr-2">{error}</span>
        )}
        <button
          onClick={() => handleAction('start')}
          disabled={loading !== null}
          className="px-3 py-1 text-xs font-semibold rounded bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500 hover:text-white transition-colors disabled:opacity-50"
        >
          {loading === 'start' ? '...' : 'Start'}
        </button>
        <button
          onClick={() => handleAction('restart')}
          disabled={loading !== null}
          className="px-3 py-1 text-xs font-semibold rounded bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500 hover:text-white transition-colors disabled:opacity-50"
        >
          {loading === 'restart' ? '...' : 'Restart'}
        </button>
        <button
          onClick={() => handleAction('stop')}
          disabled={loading !== null}
          className="px-3 py-1 text-xs font-semibold rounded bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
        >
          {loading === 'stop' ? '...' : 'Stop'}
        </button>
      </div>
    );
  }

  // Bulk actions
  return (
    <div className="flex gap-3">
      {error && (
        <div className="text-red-400 text-xs">{error}</div>
      )}
      <button
        onClick={() => handleAction('launch-all')}
        disabled={loading !== null}
        className="px-4 py-2 bg-green-500/15 text-green-400 border border-green-500/30 rounded-lg text-xs font-semibold uppercase hover:bg-green-500 hover:text-white transition-colors disabled:opacity-50"
      >
        {loading === 'launch-all' ? 'Launching...' : 'Launch All'}
      </button>
      <button
        onClick={() => handleAction('restart-all')}
        disabled={loading !== null}
        className="px-4 py-2 bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 rounded-lg text-xs font-semibold uppercase hover:bg-yellow-500 hover:text-white transition-colors disabled:opacity-50"
      >
        {loading === 'restart-all' ? 'Restarting...' : 'Restart All'}
      </button>
      <button
        onClick={() => handleAction('stop-all')}
        disabled={loading !== null}
        className="px-4 py-2 bg-red-500/15 text-red-400 border border-red-500/30 rounded-lg text-xs font-semibold uppercase hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
      >
        {loading === 'stop-all' ? 'Stopping...' : 'Stop All'}
      </button>
    </div>
  );
}
