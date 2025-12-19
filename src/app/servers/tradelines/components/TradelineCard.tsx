'use client';

import Link from 'next/link';
import TradelineActions from './TradelineActions';

interface TradelineCardProps {
  tradeline: {
    name: string;
    displayName: string;
    ports?: {
      main: number;
      worker1: number;
      worker2: number;
      worker3: number;
      worker4: number;
    };
  };
  health?: {
    status?: string;
    online?: number;
    total?: number;
  };
}

export default function TradelineCard({ tradeline, health }: TradelineCardProps) {
  const status = health?.status || 'stopped';

  const statusColors: Record<string, string> = {
    healthy: 'bg-green-500',
    partial: 'bg-yellow-500',
    stopped: 'bg-red-500',
    degraded: 'bg-orange-500',
  };

  const statusBgColors: Record<string, string> = {
    healthy: 'bg-green-500/10 border-green-500/30',
    partial: 'bg-yellow-500/10 border-yellow-500/30',
    stopped: 'bg-red-500/10 border-red-500/30',
    degraded: 'bg-orange-500/10 border-orange-500/30',
  };

  const statusTextColors: Record<string, string> = {
    healthy: 'text-green-400',
    partial: 'text-yellow-400',
    stopped: 'text-red-400',
    degraded: 'text-orange-400',
  };

  return (
    <div className={`rounded-xl border p-4 ${statusBgColors[status] || statusBgColors.stopped}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-10 rounded ${statusColors[status] || statusColors.stopped}`} />
          <div>
            <Link
              href={`/servers/tradelines/${tradeline.name}`}
              className="font-semibold text-white hover:text-blue-400 transition-colors"
            >
              {tradeline.displayName}
            </Link>
            <div className="text-xs text-gray-500">{tradeline.name}</div>
          </div>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded ${statusTextColors[status]} ${statusBgColors[status]}`}>
          {status.toUpperCase()}
        </span>
      </div>

      {/* Ports */}
      <div className="mb-4">
        <div className="text-xs text-gray-500 mb-2">Ports</div>
        <div className="flex flex-wrap gap-2">
          <span className="font-mono text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
            Main: {tradeline.ports?.main}
          </span>
          <span className="font-mono text-xs bg-gray-700 text-gray-400 px-2 py-1 rounded">
            W1: {tradeline.ports?.worker1}
          </span>
          <span className="font-mono text-xs bg-gray-700 text-gray-400 px-2 py-1 rounded">
            W2: {tradeline.ports?.worker2}
          </span>
          <span className="font-mono text-xs bg-gray-700 text-gray-400 px-2 py-1 rounded">
            W3: {tradeline.ports?.worker3}
          </span>
          <span className="font-mono text-xs bg-gray-700 text-gray-400 px-2 py-1 rounded">
            W4: {tradeline.ports?.worker4}
          </span>
        </div>
      </div>

      {/* Health */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Online</span>
          <span className={statusTextColors[status]}>
            {health?.online || 0} / {health?.total || 5}
          </span>
        </div>
        <div className="mt-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${statusColors[status] || statusColors.stopped} transition-all`}
            style={{ width: `${((health?.online || 0) / (health?.total || 5)) * 100}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Link
          href={`/servers/tradelines/${tradeline.name}`}
          className="text-xs text-gray-400 hover:text-white transition-colors"
        >
          View Details
        </Link>
        <TradelineActions tradeline={tradeline.name} />
      </div>
    </div>
  );
}
