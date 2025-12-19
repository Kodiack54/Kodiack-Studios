'use client';

import { useState } from 'react';

interface Server {
  id: string;
  name: string;
  host: string;
  port: number;
  status: 'online' | 'offline' | 'degraded' | 'maintenance';
  cpu?: number;
  memory?: number;
  uptime?: string;
}

interface ServersPanelProps {
  servers: Server[];
}

export default function ServersPanel({ servers }: ServersPanelProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const statusColors: Record<string, string> = {
    online: 'bg-green-500',
    offline: 'bg-red-500',
    degraded: 'bg-yellow-500',
    maintenance: 'bg-blue-500',
  };

  const handleAction = async (serverId: string, action: 'start' | 'stop' | 'restart') => {
    setActionLoading(`${serverId}-${action}`);

    try {
      const res = await fetch(`/api/dev-controls/servers/${serverId}/${action}`, {
        method: 'POST',
      });

      const result = await res.json();

      if (result.success) {
        window.location.reload();
      } else {
        alert(result.error || `Failed to ${action} server`);
      }
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  // Default servers if none from API
  const displayServers = servers.length > 0 ? servers : [
    { id: 'tradelines', name: 'Tradelines', host: 'localhost', port: 7101, status: 'online' as const },
    { id: 'portals', name: 'Portals', host: 'localhost', port: 7102, status: 'online' as const },
    { id: 'nextbidder', name: 'NextBidder', host: 'localhost', port: 7103, status: 'offline' as const },
    { id: 'sources', name: 'Sources', host: 'localhost', port: 7104, status: 'online' as const },
    { id: 'nexttech', name: 'NextTech', host: 'localhost', port: 7105, status: 'degraded' as const },
    { id: 'nexttask', name: 'NextTask', host: 'localhost', port: 7106, status: 'online' as const },
  ];

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Server Status</h3>
        <span className="text-xs text-gray-500">
          {displayServers.filter((s) => s.status === 'online').length}/{displayServers.length} online
        </span>
      </div>

      <div className="space-y-2">
        {displayServers.map((server) => (
          <div
            key={server.id}
            className="flex items-center justify-between bg-gray-900 border border-gray-700 rounded-lg p-3"
          >
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${statusColors[server.status]}`} />
              <div>
                <div className="font-medium text-white text-sm">{server.name}</div>
                <div className="text-xs text-gray-500">:{server.port}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {server.cpu !== undefined && (
                <div className="text-xs text-gray-500">CPU: {server.cpu}%</div>
              )}

              {server.status === 'online' ? (
                <button
                  onClick={() => handleAction(server.id, 'restart')}
                  disabled={actionLoading !== null}
                  className="px-2 py-1 text-xs font-semibold rounded bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500 hover:text-black transition-colors disabled:opacity-50"
                >
                  {actionLoading === `${server.id}-restart` ? '...' : 'Restart'}
                </button>
              ) : (
                <button
                  onClick={() => handleAction(server.id, 'start')}
                  disabled={actionLoading !== null}
                  className="px-2 py-1 text-xs font-semibold rounded bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500 hover:text-white transition-colors disabled:opacity-50"
                >
                  {actionLoading === `${server.id}-start` ? '...' : 'Start'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
