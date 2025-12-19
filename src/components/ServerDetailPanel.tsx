'use client';

import { useState, useEffect, useRef } from 'react';
import { RoleGate } from '@/app/settings/RoleGate';
import { useUser } from '@/app/settings/UserContext';
import { StatusDot, ServerHealth, SlotStatus, ProjectStatus, WorkerStatus } from './ServerStatusIndicator';

interface ServerDetailPanelProps {
  project: ProjectStatus;
  slot?: SlotStatus;
  onClose: () => void;
  onReboot?: (target: 'all' | 'main' | number) => Promise<void>;
  onServerAction?: (action: 'start' | 'restart' | 'stop', port: string) => Promise<void>;
}

// Generate default workers for a slot (used when slot is offline/no data)
// Port format: 3[Droplet][Worker][SlotId] - e.g., 31006 = Droplet 1, Main (0), Slot 06
// (Main)Engine / (W1)Discovery / (W2)Scope of Work / (W3)Full Report / (W4)Proposal
const getDefaultWorkers = (slotId: string, status: 'online' | 'offline' | 'error' = 'offline'): WorkerStatus[] => [
  { port: parseInt(`310${slotId}`), name: 'Engine', status },
  { port: parseInt(`311${slotId}`), name: 'Discovery', status },
  { port: parseInt(`312${slotId}`), name: 'Scope of Work', status },
  { port: parseInt(`313${slotId}`), name: 'Full Report', status },
  { port: parseInt(`314${slotId}`), name: 'Proposal', status },
];

// Get workers for a slot - use real data if available, otherwise generate defaults
const getSlotWorkers = (slot: SlotStatus): WorkerStatus[] => {
  // If slot has real worker data from API, use it
  if (slot.workers && slot.workers.length > 0) {
    return slot.workers;
  }
  // Otherwise generate default workers with offline status
  return getDefaultWorkers(slot.slotId, 'offline');
};

export default function ServerDetailPanel({ project, slot, onClose, onReboot, onServerAction }: ServerDetailPanelProps) {
  const { hasPermission } = useUser();
  const [activeTab, setActiveTab] = useState<'health' | 'logs'>('health');
  const [logText, setLogText] = useState<string>('');
  const [logLoading, setLogLoading] = useState(false);
  const [rebooting, setRebooting] = useState<string | null>(null);
  const [serverActionLoading, setServerActionLoading] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Fetch real logs from patcher API
  const fetchLogs = async () => {
    if (!slot) return;
    setLogLoading(true);
    try {
      const encodedTradeline = encodeURIComponent(slot.tradeline);
      console.log('Fetching logs for tradeline:', slot.tradeline, 'encoded:', encodedTradeline);
      const res = await fetch(`/api/patcher/server/logs/${encodedTradeline}?lines=50`);
      const data = await res.json();
      console.log('Logs response:', data);
      if (data.success && data.logs) {
        setLogText(data.logs);
      } else {
        setLogText(`Error: ${data.error || 'Failed to fetch logs'}\n\nTradeline: ${slot.tradeline}\nPort: ${slot.mainPort}\nProcess: ${data.process || 'unknown'}`);
      }
    } catch (error) {
      setLogText('Error fetching logs: ' + (error as Error).message);
    } finally {
      setLogLoading(false);
    }
  };


  // Auto-scroll logs
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logText, autoScroll]);


  const workers = slot ? getSlotWorkers(slot) : [];

  const handleReboot = async (target: 'all' | 'main' | number) => {
    const confirmMsg = target === 'all'
      ? `Reboot ALL workers for ${slot?.tradeline || project.name}?`
      : target === 'main'
      ? `Reboot main server for ${slot?.tradeline || project.name}?`
      : `Reboot worker on port ${target}?`;

    if (!confirm(confirmMsg)) return;

    setRebooting(target.toString());
    try {
      await onReboot?.(target);
      // Button stays in "Rebooting..." state for a few seconds
      // Health will update via the parent's polling
      setTimeout(() => setRebooting(null), 5000);
    } catch (error) {
      setRebooting(null);
    }
  };

  const handleServerAction = async (action: 'start' | 'restart' | 'stop') => {
    if (!slot) return;

    const confirmMessages: Record<string, string> = {
      'start': `Start all workers for port ${slot.mainPort}?`,
      'restart': `Restart all workers for port ${slot.mainPort}? This will briefly interrupt service.`,
      'stop': `Stop all workers for port ${slot.mainPort}? Service will go offline.`,
    };

    if (!confirm(confirmMessages[action])) return;

    setServerActionLoading(action);
    try {
      await onServerAction?.(action, slot.mainPort.toString());
      setTimeout(() => {
        setServerActionLoading(null);
        window.location.reload();
      }, 2000);
    } catch (error) {
      setServerActionLoading(null);
    }
  };

  return (
    <>
      {/* Backdrop - click to close (starts after sidebar width) */}
      <div
        className="fixed top-14 bottom-0 left-64 right-0 z-30"
        onClick={onClose}
      />
      <div className="fixed top-14 bottom-0 left-64 w-[480px] bg-gray-900 border-l border-gray-700 z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div>
          <div className="flex items-center gap-2">
            <StatusDot health={slot?.health || project.health} size="md" />
            <h3 className="text-lg font-semibold text-white">
              {slot ? `${slot.tradeline} (Slot ${slot.slotId})` : project.name}
            </h3>
          </div>
          <div className="text-sm text-gray-400 mt-1">
            {slot ? `Port ${slot.mainPort} + workers` : `Patcher ${project.patcherPort}`}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-2xl leading-none"
        >
          &times;
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('health')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'health'
              ? 'text-white bg-gray-700'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          Health
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'logs'
              ? 'text-white bg-gray-700'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          Logs
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {/* Health Tab */}
        {activeTab === 'health' && (
          <div className="p-4 space-y-4 h-full overflow-y-auto">
            {/* Overall Health */}
            <div className={`rounded-xl p-4 border ${
              (slot?.health || project.health) === 'healthy' ? 'bg-green-500/10 border-green-500/30' :
              (slot?.health || project.health) === 'degraded' ? 'bg-yellow-500/10 border-yellow-500/30' :
              'bg-red-500/10 border-red-500/30'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-400 uppercase tracking-wider">Overall Health</div>
                  <div className={`text-2xl font-bold capitalize ${
                    (slot?.health || project.health) === 'healthy' ? 'text-green-400' :
                    (slot?.health || project.health) === 'degraded' ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {slot?.health || project.health}
                  </div>
                </div>
                <div className={`text-5xl ${
                  (slot?.health || project.health) === 'healthy' ? 'text-green-400' :
                  (slot?.health || project.health) === 'degraded' ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {(slot?.health || project.health) === 'healthy' ? '✓' :
                   (slot?.health || project.health) === 'degraded' ? '⚠' : '✗'}
                </div>
              </div>
            </div>

            {/* Workers Status */}
            {slot && (
              <div className="bg-gray-800 border border-gray-700 rounded-xl">
                <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
                  <h4 className="font-medium text-white">Workers ({workers.length})</h4>
                  <RoleGate permission="canPushToTest">
                    <button
                      onClick={() => handleReboot('all')}
                      disabled={rebooting === 'all'}
                      className="px-3 py-1 text-xs font-semibold rounded bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
                    >
                      {rebooting === 'all' ? 'Rebooting...' : 'Reboot All'}
                    </button>
                  </RoleGate>
                </div>
                <div className="divide-y divide-gray-700">
                  {workers.map((worker) => (
                    <div key={worker.port} className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${
                          worker.status === 'online' ? 'bg-green-500' :
                          worker.status === 'error' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`} />
                        <div>
                          <div className="text-sm font-medium text-white capitalize">{worker.name}</div>
                          <div className="text-xs text-gray-500">Port {worker.port}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className={`text-xs ${
                            worker.status === 'online' ? 'text-green-400' :
                            worker.status === 'error' ? 'text-yellow-400' :
                            'text-red-400'
                          }`}>
                            {worker.status === 'online' ? 'Online' : worker.status === 'error' ? 'Error' : 'Offline'}
                          </div>
                          {worker.lastPing && (
                            <div className="text-xs text-gray-600">{worker.lastPing}</div>
                          )}
                          {worker.errorCount && worker.errorCount > 0 && (
                            <div className="text-xs text-red-400">{worker.errorCount} errors</div>
                          )}
                        </div>
                        <RoleGate permission="canPushToTest">
                          <button
                            onClick={() => handleReboot(worker.port)}
                            disabled={rebooting === worker.port.toString()}
                            className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors disabled:opacity-50"
                          >
                            {rebooting === worker.port.toString() ? '...' : 'Reboot'}
                          </button>
                        </RoleGate>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Metrics */}
            {slot && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                  <div className="text-xs text-gray-500 uppercase tracking-wider">CPU</div>
                  <div className="text-2xl font-bold text-white mt-1">{slot.cpu || 0}%</div>
                  <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        (slot.cpu || 0) > 80 ? 'bg-red-500' :
                        (slot.cpu || 0) > 60 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${slot.cpu || 0}%` }}
                    />
                  </div>
                </div>
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Memory</div>
                  <div className="text-2xl font-bold text-white mt-1">{slot.memory || 0}%</div>
                  <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        (slot.memory || 0) > 80 ? 'bg-red-500' :
                        (slot.memory || 0) > 60 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${slot.memory || 0}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Server Actions */}
            {slot && (
              <div className="grid grid-cols-3 gap-3 mt-4">
                <button
                  onClick={() => handleServerAction('start')}
                  disabled={serverActionLoading !== null}
                  className="py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-500 transition-colors disabled:opacity-50"
                >
                  {serverActionLoading === 'start' ? 'Starting...' : 'Start'}
                </button>
                <button
                  onClick={() => handleServerAction('restart')}
                  disabled={serverActionLoading !== null}
                  className="py-3 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-500 transition-colors disabled:opacity-50"
                >
                  {serverActionLoading === 'restart' ? 'Restarting...' : 'Restart'}
                </button>
                <button
                  onClick={() => handleServerAction('stop')}
                  disabled={serverActionLoading !== null}
                  className="py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-500 transition-colors disabled:opacity-50"
                >
                  {serverActionLoading === 'stop' ? 'Stopping...' : 'Stop'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className="h-full flex flex-col">
            {/* Logs Controls */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-gray-800/50">
              <div className="text-sm text-gray-400">
                PM2 Logs - nextbid-{slot?.mainPort}
              </div>
              <button
                onClick={fetchLogs}
                disabled={logLoading}
                className="px-3 py-1.5 text-xs bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                {logLoading ? 'Loading...' : 'Get Last 50 Lines'}
              </button>
            </div>

            {/* Logs */}
            <div ref={logContainerRef} className="flex-1 overflow-y-auto p-3 font-mono text-xs bg-black/30">
              {logLoading ? (
                <div className="text-gray-500">Loading logs...</div>
              ) : logText ? (
                <pre className="text-gray-300 whitespace-pre-wrap">{logText}</pre>
              ) : (
                <div className="text-gray-500 text-center py-8">
                  <p>Click "Get Last 50 Lines" to fetch PM2 logs</p>
                  <p className="text-gray-600 mt-2 text-xs">Requires PM2 process to be running on server</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
    </>
  );
}
