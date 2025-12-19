'use client';

interface Process {
  name: string;
  pm_id: number;
  status: string;
  memory: number;
  cpu: number;
}

interface ServerListItemProps {
  name: string;
  displayName: string;
  port: number;
  status: string;
  online: number;
  total: number;
  processes: Process[];
  storageBytes?: number;
  isSelected: boolean;
  onClick: () => void;
}

// Worker config matching the main table
const WORKERS = [
  { name: 'SOW', offset: 100 },
  { name: 'Docs', offset: 200 },
  { name: 'Proposal', offset: 300 },
];

// Storage limit per tradeline (8 GB)
const STORAGE_LIMIT_BYTES = 8 * 1024 * 1024 * 1024;

export default function ServerListItem({
  name,
  displayName,
  port,
  status,
  online,
  total,
  processes,
  storageBytes = 0,
  isSelected,
  onClick,
}: ServerListItemProps) {
  // Check if main is online
  const mainProcess = processes.find(p => p.name.includes('-main'));
  const mainOnline = mainProcess?.status === 'online';

  // Get worker statuses
  const workerStatuses = WORKERS.map((w, i) => {
    const workerProcess = processes.find(p =>
      p.name.includes(`-w${i + 2}`) || p.name.includes(w.name.toLowerCase())
    );
    return {
      ...w,
      port: port + w.offset,
      online: workerProcess?.status === 'online',
      cpu: workerProcess?.cpu || 0,
      memory: workerProcess?.memory || 0,
    };
  });

  // Calculate aggregate metrics
  const totalCpu = processes.reduce((sum, p) => sum + (p.cpu || 0), 0);
  const totalMemory = processes.reduce((sum, p) => sum + (p.memory || 0), 0);
  const avgCpu = processes.length > 0 ? totalCpu / processes.length : 0;
  const memoryMB = totalMemory / (1024 * 1024); // Convert to MB

  // Status colors
  const statusColors: Record<string, string> = {
    healthy: 'border-green-500 bg-green-500/10',
    partial: 'border-yellow-500 bg-yellow-500/10',
    stopped: 'border-red-500 bg-red-500/10',
    degraded: 'border-orange-500 bg-orange-500/10',
  };

  const selectedClass = isSelected
    ? 'ring-2 ring-blue-500 bg-blue-500/20'
    : 'hover:bg-gray-700/50';

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-4 px-4 py-3 cursor-pointer border-l-4 transition-all ${statusColors[status] || statusColors.stopped} ${selectedClass}`}
    >
      {/* Port & Name */}
      <div className="w-32 flex-shrink-0">
        <div className="font-mono text-sm text-white font-bold">{port}</div>
        <div className="text-xs text-gray-400 truncate">{displayName}</div>
      </div>

      {/* Status Dots (Main + 3 Workers) */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <div
          className={`w-3 h-3 rounded-full ${mainOnline ? 'bg-green-500' : 'bg-red-500'}`}
          title={`Main: ${mainOnline ? 'Online' : 'Offline'}`}
        />
        {workerStatuses.map((w) => (
          <div
            key={w.name}
            className={`w-3 h-3 rounded-full ${w.online ? 'bg-green-500' : 'bg-red-500'}`}
            title={`${w.name}: ${w.online ? 'Online' : 'Offline'}`}
          />
        ))}
      </div>

      {/* Resource Bars */}
      <div className="flex items-center gap-3 flex-1">
        {/* CPU */}
        <div className="flex items-center gap-1.5 flex-1 max-w-20">
          <span className="text-[10px] text-gray-500 w-7">CPU</span>
          <div className="flex-1 h-2 bg-gray-700 rounded overflow-hidden">
            <div
              className={`h-full transition-all ${avgCpu > 80 ? 'bg-red-500' : avgCpu > 50 ? 'bg-yellow-500' : 'bg-cyan-500'}`}
              style={{ width: `${Math.min(avgCpu, 100)}%` }}
            />
          </div>
        </div>

        {/* Memory */}
        <div className="flex items-center gap-1.5 flex-1 max-w-20">
          <span className="text-[10px] text-gray-500 w-7">MEM</span>
          <div className="flex-1 h-2 bg-gray-700 rounded overflow-hidden">
            <div
              className={`h-full transition-all ${memoryMB > 400 ? 'bg-red-500' : memoryMB > 200 ? 'bg-yellow-500' : 'bg-cyan-500'}`}
              style={{ width: `${Math.min((memoryMB / 512) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Network (placeholder - would need real data) */}
        <div className="flex items-center gap-1.5 flex-1 max-w-20">
          <span className="text-[10px] text-gray-500 w-7">NET</span>
          <div className="flex-1 h-2 bg-gray-700 rounded overflow-hidden">
            <div className="h-full bg-cyan-500" style={{ width: '25%' }} />
          </div>
        </div>

        {/* Disk - storage usage (8 GB limit per tradeline) */}
        <div className="flex items-center gap-1.5 flex-1 max-w-20">
          <span className="text-[10px] text-gray-500 w-7">DISK</span>
          <div className="flex-1 h-2 bg-gray-700 rounded overflow-hidden">
            {(() => {
              const diskPercent = (storageBytes / STORAGE_LIMIT_BYTES) * 100;
              const diskColor = diskPercent > 90 ? 'bg-red-500' : diskPercent > 75 ? 'bg-yellow-500' : 'bg-cyan-500';
              return <div className={`h-full ${diskColor}`} style={{ width: `${Math.min(diskPercent, 100)}%` }} />;
            })()}
          </div>
        </div>
      </div>

      {/* Health Indicator */}
      <div className="flex-shrink-0 w-10 text-center">
        {status === 'healthy' ? (
          <span className="text-green-400 text-lg">✓</span>
        ) : status === 'partial' ? (
          <span className="text-yellow-400 text-sm">{online}/{total}</span>
        ) : (
          <span className="text-red-400 text-lg">✗</span>
        )}
      </div>

      {/* Open Site Button - Redirects via API to pass JWT token */}
      <a
        href={`/api/engine-redirect?port=${port}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={`flex-shrink-0 px-4 py-1.5 text-sm font-medium rounded transition-colors ${
          mainOnline
            ? 'bg-green-600 hover:bg-green-500 text-white'
            : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
        }`}
      >
        Online
      </a>
    </div>
  );
}
