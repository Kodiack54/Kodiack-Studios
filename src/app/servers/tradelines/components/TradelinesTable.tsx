'use client';

import Link from 'next/link';
import TradelineActions from './TradelineActions';
import LogsViewer from './LogsViewer';
import { useState } from 'react';

interface Process {
  name: string;
  pm_id: number;
  status: string;
  memory: number;
  cpu: number;
}

interface Tradeline {
  name: string;
  displayName: string;
  ports?: {
    main: number;
    worker1?: number;
    worker2?: number;
    worker3?: number;
    worker4?: number;
  };
}

interface TradelineHealth {
  status?: string;
  online?: number;
  total?: number;
  port?: number;
  processes?: Process[];
}

interface TradelinesTableProps {
  tradelines: Tradeline[];
  healthAll: {
    tradelines?: Record<string, TradelineHealth>;
  };
}

// Worker config: 1 main + 3 workers = 4 total per tradeline
const WORKERS = [
  { name: 'SOW', offset: 100 },
  { name: 'Docs', offset: 200 },
  { name: 'Proposal', offset: 300 },
];

export default function TradelinesTable({ tradelines, healthAll }: TradelinesTableProps) {
  const [viewingLogs, setViewingLogs] = useState<string | null>(null);

  return (
    <div>
      {/* Logs Modal */}
      {viewingLogs && (
        <LogsViewer
          tradeline={viewingLogs}
          onClose={() => setViewingLogs(null)}
        />
      )}

      {/* Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-black/30 border-b border-gray-700">
              <th className="px-4 py-3 text-left text-xs uppercase text-gray-500 font-medium">Tradeline</th>
              <th className="px-4 py-3 text-left text-xs uppercase text-gray-500 font-medium">Main Port</th>
              <th className="px-4 py-3 text-left text-xs uppercase text-gray-500 font-medium">Workers</th>
              <th className="px-4 py-3 text-left text-xs uppercase text-gray-500 font-medium">Status</th>
              <th className="px-4 py-3 text-right text-xs uppercase text-gray-500 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tradelines.map((t) => {
              const status = healthAll.tradelines?.[t.name] || {};
              const statusClass = status.status || 'stopped';

              const statusColors: Record<string, string> = {
                healthy: 'bg-green-500',
                partial: 'bg-yellow-500',
                stopped: 'bg-red-500',
                degraded: 'bg-orange-500',
              };

              const badgeColors: Record<string, string> = {
                healthy: 'bg-green-500/20 text-green-400',
                partial: 'bg-yellow-500/20 text-yellow-400',
                stopped: 'bg-red-500/20 text-red-400',
                degraded: 'bg-orange-500/20 text-orange-400',
              };

              // Get process status for each port
              const mainPort = t.ports?.main || 0;
              const processes = status.processes || [];

              // Check if main is online
              const mainProcess = processes.find(p => p.name.includes('-main'));
              const mainOnline = mainProcess?.status === 'online';

              // Check each worker
              const workerStatuses = WORKERS.map((w, i) => {
                const workerProcess = processes.find(p =>
                  p.name.includes(`-w${i + 2}`) || p.name.includes(w.name.toLowerCase())
                );
                return {
                  ...w,
                  port: mainPort + w.offset,
                  online: workerProcess?.status === 'online',
                };
              });

              return (
                <tr key={t.name} className="border-b border-gray-700 hover:bg-blue-500/5">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-1 h-10 rounded ${statusColors[statusClass]}`} />
                      <div>
                        <Link
                          href={`/servers/tradelines/${t.name}`}
                          className="font-medium text-white hover:text-blue-400 transition-colors"
                        >
                          {t.displayName}
                        </Link>
                        <div className="text-xs text-gray-500">{t.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${mainOnline ? 'bg-green-500' : 'bg-red-500'}`} title={mainOnline ? 'Online' : 'Offline'} />
                      <span className="font-mono text-sm text-white">
                        {mainPort}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {workerStatuses.map((w) => (
                        <div key={w.name} className="flex items-center gap-1" title={`${w.name}: ${w.online ? 'Online' : 'Offline'}`}>
                          <div className={`w-3 h-3 rounded-full ${w.online ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span className="font-mono text-xs text-gray-400">{w.port}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${badgeColors[statusClass]}`}>
                      {status.status || 'stopped'} ({status.online || 0}/{status.total || 4})
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <TradelineActions tradeline={t.name} />
                      <button
                        onClick={() => setViewingLogs(t.name)}
                        className="px-3 py-1 text-xs font-semibold rounded bg-gray-700 text-gray-400 hover:text-white transition-colors"
                      >
                        Logs
                      </button>
                      <Link
                        href={`/servers/tradelines/credentials?tradeline=${t.name}`}
                        className="px-3 py-1 text-xs font-semibold rounded bg-purple-500/15 text-purple-400 border border-purple-500/30 hover:bg-purple-500 hover:text-white transition-colors"
                      >
                        Creds
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
