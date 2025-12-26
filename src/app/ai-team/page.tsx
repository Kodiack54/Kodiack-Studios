'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle, Play, RotateCcw, Square, DollarSign, Zap, Clock, Bell } from 'lucide-react';

// AI Team Members with model info and budget limits
const AI_TEAM = [
  { id: 'chad', name: 'Chad', port: 5401, role: 'Capture', title: 'Information Capture', model: 'openai', dailyLimit: 0.50, color: 'cyan' },
  { id: 'jen', name: 'Jen', port: 5402, role: 'Extract', title: 'Data Quality', model: 'claude', dailyLimit: 1.50, color: 'purple' },
  { id: 'susan', name: 'Susan', port: 5403, role: 'Sort', title: 'Information Analyst', model: 'openai', dailyLimit: 0.50, color: 'pink' },
  { id: 'clair', name: 'Clair', port: 5404, role: 'Document', title: 'Documentation', model: 'claude', dailyLimit: 2.00, color: 'blue' },
  { id: 'mike', name: 'Mike', port: 5405, role: 'QA', title: 'Quality Assurance', model: 'openai', dailyLimit: 0.25, color: 'green' },
  { id: 'tiffany', name: 'Tiffany', port: 5406, role: 'QA', title: 'Quality Assurance', model: 'openai', dailyLimit: 0.25, color: 'yellow' },
  { id: 'ryan', name: 'Ryan', port: 5407, role: 'Roadmap', title: 'Product Operations', model: 'openai', dailyLimit: 0.25, color: 'orange' },
];

// Infrastructure services
const INFRASTRUCTURE = [
  { id: 'terminal', name: 'Terminal', port: 5400, role: 'Claude Terminal' },
  { id: 'dashboard', name: 'Dashboard', port: 5500, role: 'Web UI' },
];

interface WorkerStatus {
  id: string;
  status: 'online' | 'offline' | 'stuck' | 'error';
  lastHeartbeat?: string;
  responseTime?: number;
}

interface WorkerUsage {
  id: string;
  requests: number;
  tokens: number;
  cost: number;
}

interface PipelineStats {
  sessions_today: number;
  extractions_today: number;
  docs_published: number;
  flagged: number;
  pending: number;
}

export default function AITeamPage() {
  const [workerStatuses, setWorkerStatuses] = useState<Record<string, WorkerStatus>>({});
  const [workerUsage, setWorkerUsage] = useState<Record<string, WorkerUsage>>({});
  const [pipelineStats, setPipelineStats] = useState<PipelineStats | null>(null);
  const [totalCostToday, setTotalCostToday] = useState(0);
  const [dailyBudget] = useState(5.00); // Total daily budget
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
        if (data.success && data.by_assistant) {
          const usageMap: Record<string, WorkerUsage> = {};
          let total = 0;
          for (const assistant of data.by_assistant) {
            const id = assistant.assistant_name?.toLowerCase();
            if (id) {
              usageMap[id] = {
                id,
                requests: assistant.requests || 0,
                tokens: assistant.total_tokens || 0,
                cost: assistant.cost_usd || 0,
              };
              total += assistant.cost_usd || 0;
            }
          }
          setWorkerUsage(usageMap);
          setTotalCostToday(total);
        }
      }

      // Process pipeline stats
      if (statsRes?.ok) {
        const data = await statsRes.json();
        if (data.success && data.stats) {
          setPipelineStats({
            sessions_today: data.stats.last_24h || 0,
            extractions_today: data.stats.flagged || 0,
            docs_published: data.stats.cleaned || 0,
            flagged: data.stats.flagged || 0,
            pending: data.stats.pending || 0,
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
        setTimeout(refreshAll, 2000);
      }
    } catch (err) {
      console.error(`Failed to ${action} ${workerId}:`, err);
    } finally {
      setActionLoading(null);
    }
  };

  // Calculate overall health
  const onlineCount = AI_TEAM.filter(w => workerStatuses[w.id]?.status === 'online').length;
  const totalCount = AI_TEAM.length;
  const overallHealth = onlineCount === totalCount ? 'healthy' : onlineCount > 0 ? 'degraded' : 'down';
  const budgetPercent = (totalCostToday / dailyBudget) * 100;
  const budgetAlert = budgetPercent > 80;

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white overflow-hidden">
      {/* Header - Compact */}
      <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold">AI Team</h1>
          <HealthBadge health={overallHealth} />
          <span className="text-sm text-gray-400">{onlineCount}/{totalCount}</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Budget Alert */}
          <div className={`flex items-center gap-2 px-2 py-1 rounded ${budgetAlert ? 'bg-red-900/50 text-red-400' : 'bg-gray-700 text-gray-300'}`}>
            <DollarSign className="w-4 h-4" />
            <span className="text-sm font-mono">${totalCostToday.toFixed(2)} / ${dailyBudget.toFixed(2)}</span>
            {budgetAlert && <Bell className="w-4 h-4 animate-pulse" />}
          </div>
          {lastRefresh && (
            <span className="text-xs text-gray-500">{lastRefresh.toLocaleTimeString()}</span>
          )}
          <button
            onClick={refreshAll}
            disabled={loading}
            className="p-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="px-4 py-1 bg-red-900/50 border-b border-red-700 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Stats Row - Compact */}
      <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700 shrink-0">
        <div className="flex items-center gap-6">
          <Stat icon={Zap} label="Sessions" value={pipelineStats?.sessions_today || 0} color="cyan" />
          <Stat icon={Zap} label="Extracted" value={pipelineStats?.extractions_today || 0} color="purple" />
          <Stat icon={CheckCircle} label="Published" value={pipelineStats?.docs_published || 0} color="green" />
          <Stat icon={Clock} label="Pending" value={pipelineStats?.pending || 0} color="yellow" />
          <div className="flex-1" />
          {/* Budget Bar */}
          <div className="w-48">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-400">Daily Budget</span>
              <span className={budgetAlert ? 'text-red-400' : 'text-gray-400'}>{budgetPercent.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${budgetPercent > 90 ? 'bg-red-500' : budgetPercent > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(budgetPercent, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Workers List - Compact */}
        <div className="flex-1 overflow-auto p-2">
          <div className="space-y-1">
            {AI_TEAM.map(worker => (
              <WorkerRow
                key={worker.id}
                worker={worker}
                status={workerStatuses[worker.id]}
                usage={workerUsage[worker.id]}
                actionLoading={actionLoading}
                onControl={controlWorker}
              />
            ))}
          </div>

          {/* Infrastructure - Compact */}
          <div className="mt-3 pt-2 border-t border-gray-700">
            <div className="text-xs text-gray-500 mb-1 px-2">Infrastructure</div>
            <div className="space-y-1">
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

        {/* Right Panel - Budget Alerts & Limits */}
        <div className="w-64 border-l border-gray-700 bg-gray-800/30 p-3 overflow-auto">
          <div className="text-sm font-medium text-gray-300 mb-2">Budget Limits</div>
          <div className="space-y-2">
            {AI_TEAM.map(worker => {
              const usage = workerUsage[worker.id];
              const cost = usage?.cost || 0;
              const percent = (cost / worker.dailyLimit) * 100;
              const overBudget = percent > 100;
              const nearBudget = percent > 80;

              return (
                <div key={worker.id} className="text-xs">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-300">{worker.name}</span>
                      <span className={`px-1 rounded text-[10px] ${worker.model === 'claude' ? 'bg-purple-900/50 text-purple-400' : 'bg-green-900/50 text-green-400'}`}>
                        {worker.model === 'claude' ? 'Claude' : 'GPT'}
                      </span>
                    </div>
                    <span className={overBudget ? 'text-red-400' : nearBudget ? 'text-yellow-400' : 'text-gray-500'}>
                      ${cost.toFixed(2)} / ${worker.dailyLimit.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${overBudget ? 'bg-red-500' : nearBudget ? 'bg-yellow-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Model Costs Reference */}
          <div className="mt-4 pt-3 border-t border-gray-700">
            <div className="text-sm font-medium text-gray-300 mb-2">Model Costs</div>
            <div className="space-y-1 text-xs text-gray-500">
              <div className="flex justify-between">
                <span className="text-purple-400">Claude Haiku</span>
                <span>$0.25 / $1.25 /1M</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-400">GPT-4o-mini</span>
                <span>$0.15 / $0.60 /1M</span>
              </div>
            </div>
          </div>

          {/* Alerts */}
          <div className="mt-4 pt-3 border-t border-gray-700">
            <div className="text-sm font-medium text-gray-300 mb-2">Alerts</div>
            <div className="space-y-1">
              {AI_TEAM.filter(w => {
                const usage = workerUsage[w.id];
                return usage && (usage.cost / w.dailyLimit) > 0.8;
              }).map(worker => (
                <div key={worker.id} className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-900/20 px-2 py-1 rounded">
                  <AlertTriangle className="w-3 h-3" />
                  <span>{worker.name} near limit</span>
                </div>
              ))}
              {AI_TEAM.filter(w => {
                const status = workerStatuses[w.id];
                return status?.status === 'offline' || status?.status === 'error';
              }).map(worker => (
                <div key={worker.id} className="flex items-center gap-2 text-xs text-red-400 bg-red-900/20 px-2 py-1 rounded">
                  <XCircle className="w-3 h-3" />
                  <span>{worker.name} offline</span>
                </div>
              ))}
              {AI_TEAM.every(w => workerStatuses[w.id]?.status !== 'offline') &&
               AI_TEAM.every(w => !workerUsage[w.id] || (workerUsage[w.id].cost / w.dailyLimit) <= 0.8) && (
                <div className="text-xs text-gray-500">No alerts</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Compact Stat
function Stat({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    cyan: 'text-cyan-400',
    purple: 'text-purple-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
  };

  return (
    <div className="flex items-center gap-2">
      <Icon className={`w-4 h-4 ${colors[color]}`} />
      <span className={`font-bold ${colors[color]}`}>{value}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

// Compact Worker Row
function WorkerRow({ worker, status, usage, actionLoading, onControl }: {
  worker: typeof AI_TEAM[0];
  status?: WorkerStatus;
  usage?: WorkerUsage;
  actionLoading: string | null;
  onControl: (id: string, action: 'start' | 'stop' | 'restart') => void;
}) {
  const workerStatus = status?.status || 'offline';
  const cost = usage?.cost || 0;
  const requests = usage?.requests || 0;
  const budgetPercent = (cost / worker.dailyLimit) * 100;
  const overBudget = budgetPercent > 100;

  const statusConfig = {
    online: { color: 'bg-green-500', label: 'ON' },
    offline: { color: 'bg-gray-500', label: 'OFF' },
    stuck: { color: 'bg-yellow-500 animate-pulse', label: 'STUCK' },
    error: { color: 'bg-red-500 animate-pulse', label: 'ERR' },
  };

  const config = statusConfig[workerStatus];
  const borderColors: Record<string, string> = {
    cyan: 'border-l-cyan-500',
    purple: 'border-l-purple-500',
    pink: 'border-l-pink-500',
    blue: 'border-l-blue-500',
    green: 'border-l-green-500',
    yellow: 'border-l-yellow-500',
    orange: 'border-l-orange-500',
  };

  return (
    <div className={`flex items-center gap-2 px-2 py-1.5 rounded bg-gray-800/50 border-l-2 ${borderColors[worker.color]}`}>
      {/* Status Light */}
      <div className={`w-2 h-2 rounded-full ${config.color}`} title={config.label} />

      {/* Name & Role */}
      <div className="w-20">
        <span className="font-medium text-white">{worker.name}</span>
      </div>
      <div className="w-16 text-xs text-gray-500">{worker.role}</div>

      {/* Model Badge */}
      <div className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${worker.model === 'claude' ? 'bg-purple-900/50 text-purple-400' : 'bg-green-900/50 text-green-400'}`}>
        {worker.model === 'claude' ? 'Claude' : 'GPT'}
      </div>

      {/* Port */}
      <div className="w-12 text-xs text-gray-600 font-mono">:{worker.port}</div>

      {/* Usage Stats */}
      <div className="flex-1 flex items-center gap-3 text-xs">
        <span className="text-gray-500">{requests} reqs</span>
        <span className={overBudget ? 'text-red-400 font-medium' : 'text-gray-400'}>${cost.toFixed(3)}</span>
      </div>

      {/* Mini Budget Bar */}
      <div className="w-16 h-1 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${overBudget ? 'bg-red-500' : budgetPercent > 80 ? 'bg-yellow-500' : 'bg-blue-500'}`}
          style={{ width: `${Math.min(budgetPercent, 100)}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onControl(worker.id, 'start')}
          disabled={actionLoading === `${worker.id}-start` || workerStatus === 'online'}
          className="p-1 rounded hover:bg-green-600/30 disabled:opacity-30 transition-colors"
          title="Start"
        >
          <Play className="w-3 h-3 text-green-400" />
        </button>
        <button
          onClick={() => onControl(worker.id, 'restart')}
          disabled={actionLoading === `${worker.id}-restart`}
          className="p-1 rounded hover:bg-orange-600/30 disabled:opacity-30 transition-colors"
          title="Restart"
        >
          <RotateCcw className={`w-3 h-3 text-orange-400 ${actionLoading === `${worker.id}-restart` ? 'animate-spin' : ''}`} />
        </button>
        <button
          onClick={() => onControl(worker.id, 'stop')}
          disabled={actionLoading === `${worker.id}-stop` || workerStatus === 'offline'}
          className="p-1 rounded hover:bg-red-600/30 disabled:opacity-30 transition-colors"
          title="Stop"
        >
          <Square className="w-3 h-3 text-red-400" />
        </button>
      </div>
    </div>
  );
}

// Compact Infrastructure Row
function InfraRow({ service, status }: { service: typeof INFRASTRUCTURE[0]; status?: WorkerStatus }) {
  const workerStatus = status?.status || 'offline';
  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-500',
    stuck: 'bg-yellow-500',
    error: 'bg-red-500',
  };

  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded bg-gray-800/30 text-sm">
      <div className={`w-2 h-2 rounded-full ${statusColors[workerStatus]}`} />
      <span className="text-gray-300">{service.name}</span>
      <span className="text-xs text-gray-600 font-mono">:{service.port}</span>
      <span className="flex-1 text-xs text-gray-500 text-right">{service.role}</span>
    </div>
  );
}

// Health Badge
function HealthBadge({ health }: { health: 'healthy' | 'degraded' | 'down' }) {
  const config = {
    healthy: { bg: 'bg-green-600/20', text: 'text-green-400', icon: CheckCircle },
    degraded: { bg: 'bg-yellow-600/20', text: 'text-yellow-400', icon: AlertTriangle },
    down: { bg: 'bg-red-600/20', text: 'text-red-400', icon: XCircle },
  };
  const c = config[health];
  const Icon = c.icon;

  return (
    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${c.bg}`}>
      <Icon className={`w-3 h-3 ${c.text}`} />
    </div>
  );
}
