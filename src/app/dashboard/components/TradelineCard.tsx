'use client';

interface Tradeline {
  name: string;
  displayName: string;
  ports?: {
    main: number;
    worker1: number;
    worker2: number;
    worker3: number;
    worker4: number;
  };
}

interface TradelineCardProps {
  tradeline: Tradeline;
  status: {
    status?: string;
    online?: number;
    total?: number;
    lastCheck?: string;
  };
  onAction: (action: string, tradeline?: string) => void;
}

export default function TradelineCard({ tradeline, status, onAction }: TradelineCardProps) {
  const statusClass = status.status || 'stopped';

  const statusColors: Record<string, string> = {
    healthy: 'border-l-green-500',
    partial: 'border-l-yellow-500',
    stopped: 'border-l-red-500',
  };

  const statusBadgeColors: Record<string, string> = {
    healthy: 'bg-green-500/20 text-green-400',
    partial: 'bg-yellow-500/20 text-yellow-400',
    stopped: 'bg-red-500/20 text-red-400',
  };

  return (
    <div
      className={`bg-gray-800 border border-gray-700 rounded-xl p-5 border-l-4 ${statusColors[statusClass]} hover:border-blue-500 transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-lg`}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="font-semibold text-white">{tradeline.displayName}</div>
          <div className="text-xs text-gray-500 uppercase">{tradeline.name}</div>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded ${statusBadgeColors[statusClass]}`}>
          {status.status || 'stopped'}
        </span>
      </div>

      <div className="flex gap-3 mb-3 text-xs">
        <div>
          <span className="text-gray-500">Main:</span>
          <span className="ml-1 font-mono bg-black/30 px-1.5 py-0.5 rounded text-white">
            {tradeline.ports?.main || '-'}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Workers:</span>
          <span className="ml-1 font-mono bg-black/30 px-1.5 py-0.5 rounded text-white">
            {status.online || 0}/{status.total || 5}
          </span>
        </div>
      </div>

      <p className="text-xs text-gray-400 mb-4">
        Workers: {tradeline.ports?.worker1}, {tradeline.ports?.worker2}, {tradeline.ports?.worker3}, {tradeline.ports?.worker4}
      </p>

      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onAction('start', tradeline.name)}
          className="px-3 py-1.5 text-xs font-semibold rounded bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500 hover:text-white transition-colors"
        >
          Start
        </button>
        <button
          onClick={() => onAction('restart', tradeline.name)}
          className="px-3 py-1.5 text-xs font-semibold rounded bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500 hover:text-white transition-colors"
        >
          Restart
        </button>
        <button
          onClick={() => onAction('stop', tradeline.name)}
          className="px-3 py-1.5 text-xs font-semibold rounded bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white transition-colors"
        >
          Stop
        </button>
      </div>
    </div>
  );
}
