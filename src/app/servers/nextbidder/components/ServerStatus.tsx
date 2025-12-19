'use client';

import { useState } from 'react';

interface ServerStatusProps {
  health: any;
  status: any;
}

export default function ServerStatus({ health, status }: ServerStatusProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (action: string) => {
    setLoading(action);
    try {
      const res = await fetch(`/api/nextbidder/${action}`, { method: 'POST' });
      const result = await res.json();
      if (result.success) {
        window.location.reload();
      } else {
        alert(result.error || 'Action failed');
      }
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setLoading(null);
    }
  };

  const serverStatus = health?.status || 'offline';
  const statusColors: Record<string, string> = {
    healthy: 'bg-green-500',
    online: 'bg-green-500',
    degraded: 'bg-yellow-500',
    offline: 'bg-red-500',
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-4 h-4 rounded-full ${statusColors[serverStatus]}`} />
          <div>
            <div className="font-semibold text-white">Server Status</div>
            <div className="text-sm text-gray-400">
              {serverStatus.charAt(0).toUpperCase() + serverStatus.slice(1)}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleAction('start')}
            disabled={loading !== null}
            className="px-4 py-2 bg-green-500/15 text-green-400 border border-green-500/30 rounded-lg text-sm font-semibold hover:bg-green-500 hover:text-white transition-colors disabled:opacity-50"
          >
            {loading === 'start' ? '...' : 'Start'}
          </button>
          <button
            onClick={() => handleAction('restart')}
            disabled={loading !== null}
            className="px-4 py-2 bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 rounded-lg text-sm font-semibold hover:bg-yellow-500 hover:text-white transition-colors disabled:opacity-50"
          >
            {loading === 'restart' ? '...' : 'Restart'}
          </button>
          <button
            onClick={() => handleAction('stop')}
            disabled={loading !== null}
            className="px-4 py-2 bg-red-500/15 text-red-400 border border-red-500/30 rounded-lg text-sm font-semibold hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
          >
            {loading === 'stop' ? '...' : 'Stop'}
          </button>
          <button
            onClick={() => handleAction('discovery')}
            disabled={loading !== null}
            className="px-4 py-2 bg-blue-500/15 text-blue-400 border border-blue-500/30 rounded-lg text-sm font-semibold hover:bg-blue-500 hover:text-white transition-colors disabled:opacity-50"
          >
            {loading === 'discovery' ? '...' : 'Run Discovery'}
          </button>
        </div>
      </div>
    </div>
  );
}
