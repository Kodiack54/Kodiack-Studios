'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle, Play, RotateCcw, Square, Cpu, HardDrive, Activity, DollarSign, Zap, Clock } from 'lucide-react';

// AI Team Members - correct names, roles, ports
const AI_TEAM = [
  { id: 'chad', name: '01-Chad', port: 5401, role: 'Transcription & Capture', title: 'Information Capture Specialist', color: 'cyan' },
  { id: 'jen', name: '02-Jen', port: 5402, role: 'Scrubbing & Signal Extraction', title: 'Data Quality Analyst', color: 'purple' },
  { id: 'susan', name: '03-Susan', port: 5403, role: 'Classification & Sorting', title: 'Information Analyst', color: 'pink' },
  { id: 'clair', name: '04-Clair', port: 5404, role: 'Conversion & Documentation', title: 'Technical Documentation Specialist', color: 'blue' },
  { id: 'mike', name: '05-Mike', port: 5405, role: 'QA Tester', title: 'Quality Assurance Analyst', color: 'green' },
  { id: 'tiffany', name: '06-Tiffany', port: 5406, role: 'QA Tester', title: 'Quality Assurance Analyst', color: 'yellow' },
  { id: 'ryan', name: '07-Ryan', port: 5407, role: 'Roadmap & Prioritization Lead', title: 'Product Operations Manager', color: 'orange' },
];

// Infrastructure services
const INFRASTRUCTURE = [
  { id: 'terminal', name: 'Terminal Server', port: 5400, role: 'Claude Terminal', color: 'gray' },
  { id: 'dashboard', name: 'Dashboard', port: 5500, role: 'Web UI', color: 'indigo' },
];

interface WorkerStatus {
  id: string;
  status: 'online' | 'offline' | 'stuck' | 'error';
  uptime?: number;
  lastHeartbeat?: string;
  cpu?: number;
  memory?: number;
  responseTime?: number;
}

interface UsageData {
  totals: {
    requests: number;
    total_tokens: number;
    cost_usd: number;
  };
  budget: {
    monthly_limit: number;
    used: number;
    percent_used: number;
  };
  by_assistant: {
    assistant_name: string;
    requests: number;
    total_tokens: number;
    cost_usd: number;
  }[];
}

interface PipelineStats {
  sessions_today: number;
  extractions_today: number;
  duplicates_caught: number;
  docs_published: number;
  flagged: number;
  pending: number;
  open: number;
}

export default function AITeamPage() {
  const [workerStatuses, setWorkerStatuses] = useState<Record<string, WorkerStatus>>({});
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [pipelineStats, setPipelineStats] = useState<PipelineStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fetch all data
  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch worker statuses, usage data, and pipeline stats in parallel
      // API routes are self-contained in /ai-team/api/
      const [statusRes, usageRes, statsRes] = await Promise.all([
        fetch('/ai-team/api/status', { cache: 'no-store' }).catch(() => null),
        fetch('/ai-team/api/usage', { cache: 'no-store' }).catch(() => null),
        fetch('/api/ai-sessions/buckets', { cache: 'no-store' }).catch(() => null),
      ]);

      // Process worker statuses
      if (statusRes?.ok) {
        const data = await statusRes.json();
        if (data.success && data.workers) {
          const statusMap: Record<string, WorkerStatus> = {};
          for (const worker of data.workers) {
            statusMap[worker.id] = worker;
          }
          setWorkerStatuses(statusMap);
        }
      } else {
        // Default offline status for all workers when API not available
        const defaultStatuses: Record<string, WorkerStatus> = {};
        [...AI_TEAM, ...INFRASTRUCTURE].forEach(w => {
          defaultStatuses[w.id] = { id: w.id, status: 'offline' };
        });
        setWorkerStatuses(defaultStatuses);
      }

      // Process usage data
      if (usageRes?.ok) {
        const data = await usageRes.json();
        if (data.success) {
          setUsage(data);
        }
      }

      // Process pipeline stats
      if (statsRes?.ok) {
        const data = await statsRes.json();
        if (data.success && data.stats) {
          setPipelineStats({
            sessions_today: data.stats.last_24h || 0,
            extractions_today: data.stats.flagged || 0,
            duplicates_caught: 0, // TODO: Add to API
            docs_published: data.stats.cleaned || 0,
            flagged: data.stats.flagged || 0,
            pending: data.stats.pending || 0,
            open: data.stats.active || 0,
          });
        }
      }

      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshAll();
  }, []);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(refreshAll, 10000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  // Worker control actions
  const controlWorker = async (workerId: string, action: 'start' | 'stop' | 'restart') => {
    setActionLoading(`${workerId}-${action}`);
    try {
      const res = await fetch(`/ai-team/api/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId, action }),
      });
      if (res.ok) {
        // Refresh status after action
        setTimeout(refreshAll, 2000);
      }
    } catch (err) {
      console.error(`Failed to ${action} ${workerId}:`, err);
    } finally {
      setActionLoading(null);
    }
  };

  // Calculate overall health
  const onlineCount = Object.values(workerStatuses).filter(w => w.status === 'online').length;
  const totalCount = AI_TEAM.length;
  const overallHealth = onlineCount === totalCount ? 'healthy' : onlineCount > 0 ? 'degraded' : 'down';

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gray-800 border-b border-gray-700 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">AI Team Monitor</h1>
          <span className="text-sm text-gray-400">{onlineCount}/{totalCount} Online</span>
          <HealthBadge health={overallHealth} />
        </div>
        <div className="flex items-center gap-4">
          {lastRefresh && (
            <span className="text-xs text-gray-500">
              Updated: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={refreshAll}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white text-sm rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="px-6 py-2 bg-red-900/50 border-b border-red-700 text-red-300 text-sm">
          Error: {error}
        </div>
      )}

      {/* Stats Summary Row */}
      <div className="px-6 py-4 bg-gray-800/50 border-b border-gray-700 shrink-0">
        <div className="grid grid-cols-6 gap-4">
          <StatCard
            icon={Activity}
            label="Sessions Today"
            value={pipelineStats?.sessions_today || 0}
            color="cyan"
          />
          <StatCard
            icon={Zap}
            label="Extractions"
            value={pipelineStats?.extractions_today || 0}
            color="purple"
          />
          <StatCard
            icon={CheckCircle}
            label="Published"
            value={pipelineStats?.docs_published || 0}
            color="green"
          />
          <StatCard
            icon={Clock}
            label="Pending"
            value={pipelineStats?.pending || 0}
            color="yellow"
          />
          <StatCard
            icon={DollarSign}
            label="AI Cost Today"
            value={`$${(usage?.totals.cost_usd || 0).toFixed(2)}`}
            color="orange"
            isString
          />
          <StatCard
            icon={HardDrive}
            label="Budget Used"
            value={`${(usage?.budget.percent_used || 0).toFixed(1)}%`}
            color={usage && usage.budget.percent_used > 80 ? 'red' : 'blue'}
            isString
          />
        </div>
      </div>

      {/* Main Content - 2 columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: AI Team Workers */}
        <div className="flex-[2] flex flex-col border-r border-gray-700 min-w-0">
          <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700 shrink-0">
            <h2 className="text-sm font-medium text-gray-300">AI Team Workers</h2>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <div className="space-y-3">
              {AI_TEAM.map(worker => (
                <WorkerCard
                  key={worker.id}
                  worker={worker}
                  status={workerStatuses[worker.id]}
                  actionLoading={actionLoading}
                  onControl={controlWorker}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Usage + Infrastructure */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* AI Usage */}
          <div className="flex-1 flex flex-col border-b border-gray-700">
            <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700 shrink-0">
              <h2 className="text-sm font-medium text-gray-300">AI Usage (Today)</h2>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {usage?.by_assistant && usage.by_assistant.length > 0 ? (
                <div className="space-y-2">
                  {usage.by_assistant.map(assistant => (
                    <UsageRow key={assistant.assistant_name} data={assistant} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No usage data</p>
                </div>
              )}

              {/* Budget Bar */}
              {usage?.budget && (
                <div className="mt-4 p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">Monthly Budget</span>
                    <span className="text-xs text-gray-400">
                      ${usage.budget.used.toFixed(2)} / ${usage.budget.monthly_limit.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        usage.budget.percent_used > 90 ? 'bg-red-500' :
                        usage.budget.percent_used > 70 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(usage.budget.percent_used, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Infrastructure */}
          <div className="shrink-0">
            <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700">
              <h2 className="text-sm font-medium text-gray-300">Infrastructure</h2>
            </div>
            <div className="p-4 space-y-2">
              {INFRASTRUCTURE.map(service => (
                <InfraRow
                  key={service.id}
                  service={service}
                  status={workerStatuses[service.id]}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ icon: Icon, label, value, color, isString = false }: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
  isString?: boolean;
}) {
  const colors: Record<string, string> = {
    cyan: 'text-cyan-400',
    purple: 'text-purple-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    orange: 'text-orange-400',
    blue: 'text-blue-400',
    red: 'text-red-400',
  };

  return (
    <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${colors[color] || 'text-gray-400'}`} />
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <div className={`text-xl font-bold ${colors[color] || 'text-white'}`}>
        {isString ? value : value.toLocaleString()}
      </div>
    </div>
  );
}

// Worker Card Component
function WorkerCard({ worker, status, actionLoading, onControl }: {
  worker: typeof AI_TEAM[0];
  status?: WorkerStatus;
  actionLoading: string | null;
  onControl: (id: string, action: 'start' | 'stop' | 'restart') => void;
}) {
  const workerStatus = status?.status || 'offline';

  const statusConfig = {
    online: { color: 'bg-green-500', pulse: false, label: 'Online' },
    offline: { color: 'bg-gray-500', pulse: false, label: 'Offline' },
    stuck: { color: 'bg-yellow-500', pulse: true, label: 'Stuck' },
    error: { color: 'bg-red-500', pulse: true, label: 'Error' },
  };

  const config = statusConfig[workerStatus];
  const colorClasses: Record<string, string> = {
    cyan: 'border-l-cyan-500',
    purple: 'border-l-purple-500',
    pink: 'border-l-pink-500',
    blue: 'border-l-blue-500',
    green: 'border-l-green-500',
    yellow: 'border-l-yellow-500',
    orange: 'border-l-orange-500',
  };

  return (
    <div className={`p-4 rounded-lg bg-gray-800/50 border border-gray-700 border-l-4 ${colorClasses[worker.color] || 'border-l-gray-500'}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* Status Light */}
          <div className={`w-3 h-3 rounded-full ${config.color} ${config.pulse ? 'animate-pulse' : ''}`} />

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">{worker.name}</span>
              <span className="text-xs text-gray-500">:{worker.port}</span>
            </div>
            <div className="text-sm text-gray-400">{worker.title}</div>
            <div className="text-xs text-gray-500">{worker.role}</div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center gap-2">
          {/* Stats */}
          {status?.cpu !== undefined && (
            <div className="text-xs text-gray-500 mr-2">
              <span className="flex items-center gap-1">
                <Cpu className="w-3 h-3" /> {status.cpu}%
              </span>
            </div>
          )}
          {status?.memory !== undefined && (
            <div className="text-xs text-gray-500 mr-2">
              <span className="flex items-center gap-1">
                <HardDrive className="w-3 h-3" /> {status.memory}MB
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <button
            onClick={() => onControl(worker.id, 'start')}
            disabled={actionLoading === `${worker.id}-start` || workerStatus === 'online'}
            className="p-1.5 rounded bg-green-600/20 hover:bg-green-600/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Start"
          >
            <Play className="w-3.5 h-3.5 text-green-400" />
          </button>
          <button
            onClick={() => onControl(worker.id, 'restart')}
            disabled={actionLoading === `${worker.id}-restart`}
            className="p-1.5 rounded bg-orange-600/20 hover:bg-orange-600/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Restart"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-orange-400 ${actionLoading === `${worker.id}-restart` ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => onControl(worker.id, 'stop')}
            disabled={actionLoading === `${worker.id}-stop` || workerStatus === 'offline'}
            className="p-1.5 rounded bg-red-600/20 hover:bg-red-600/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Stop"
          >
            <Square className="w-3.5 h-3.5 text-red-400" />
          </button>
        </div>
      </div>

      {/* Response time / last heartbeat */}
      {status?.responseTime !== undefined && (
        <div className="mt-2 text-xs text-gray-500">
          Response: {status.responseTime}ms
        </div>
      )}
      {status?.lastHeartbeat && (
        <div className="mt-1 text-xs text-gray-600">
          Last heartbeat: {new Date(status.lastHeartbeat).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}

// Usage Row Component
function UsageRow({ data }: { data: { assistant_name: string; requests: number; total_tokens: number; cost_usd: number } }) {
  return (
    <div className="flex items-center justify-between p-2 rounded bg-gray-800/30">
      <div className="flex items-center gap-2">
        <span className="text-sm text-white">{data.assistant_name}</span>
      </div>
      <div className="flex items-center gap-4 text-xs">
        <span className="text-gray-400">{data.requests.toLocaleString()} reqs</span>
        <span className="text-gray-400">{(data.total_tokens / 1000).toFixed(1)}k tokens</span>
        <span className="text-green-400 font-medium">${data.cost_usd.toFixed(3)}</span>
      </div>
    </div>
  );
}

// Infrastructure Row Component
function InfraRow({ service, status }: { service: typeof INFRASTRUCTURE[0]; status?: WorkerStatus }) {
  const workerStatus = status?.status || 'offline';
  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-500',
    stuck: 'bg-yellow-500',
    error: 'bg-red-500',
  };

  return (
    <div className="flex items-center justify-between p-2 rounded bg-gray-800/30">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${statusColors[workerStatus]}`} />
        <span className="text-sm text-white">{service.name}</span>
        <span className="text-xs text-gray-500">:{service.port}</span>
      </div>
      <span className="text-xs text-gray-400">{service.role}</span>
    </div>
  );
}

// Health Badge Component
function HealthBadge({ health }: { health: 'healthy' | 'degraded' | 'down' }) {
  const config = {
    healthy: { bg: 'bg-green-600/20', text: 'text-green-400', icon: CheckCircle, label: 'All Systems Online' },
    degraded: { bg: 'bg-yellow-600/20', text: 'text-yellow-400', icon: AlertTriangle, label: 'Degraded' },
    down: { bg: 'bg-red-600/20', text: 'text-red-400', icon: XCircle, label: 'Systems Down' },
  };
  const c = config[health];
  const Icon = c.icon;

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${c.bg}`}>
      <Icon className={`w-3.5 h-3.5 ${c.text}`} />
      <span className={`text-xs font-medium ${c.text}`}>{c.label}</span>
    </div>
  );
}
