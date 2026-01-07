'use client';

import { useState, useEffect, useRef } from 'react';
import { StudioService, STATUS_COLORS } from '../config';
import { ServiceHealth } from '../lib/types';

interface OperationsDetailPanelProps {
  service: StudioService;
  onClose: () => void;
}

export default function OperationsDetailPanel({ service, onClose }: OperationsDetailPanelProps) {
  const [health, setHealth] = useState<ServiceHealth | null>(null);
  const [activeTab, setActiveTab] = useState<'health' | 'logs'>('health');
  const [logText, setLogText] = useState<string>('');
  const [logLoading, setLogLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Fetch health for this specific service
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await fetch('/api/operations/health');
        const data = await res.json();
        if (data.success) {
          const serviceHealth = data.services.find((s: ServiceHealth) => s.id === service.id);
          if (serviceHealth) setHealth(serviceHealth);
        }
      } catch (e) {
        console.error('Failed to fetch health:', e);
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, [service.id]);

  // Fetch logs
  const fetchLogs = async () => {
    if (!service.pm2Name) {
      setLogText('No PM2 process configured for this service.');
      return;
    }
    setLogLoading(true);
    try {
      const res = await fetch(`/api/operations/logs/${service.id}?lines=50`);
      const data = await res.json();
      if (data.success && data.logs) {
        setLogText(data.logs);
      } else {
        setLogText(`Error: ${data.error || 'Failed to fetch logs'}`);
      }
    } catch (error) {
      setLogText('Error fetching logs: ' + (error as Error).message);
    } finally {
      setLogLoading(false);
    }
  };

  // Handle service actions
  const handleAction = async (action: 'start' | 'restart' | 'stop') => {
    if (!service.pm2Name) {
      alert('No PM2 process configured for this service.');
      return;
    }

    const confirmMessages: Record<string, string> = {
      'start': `Start ${service.label}?`,
      'restart': `Restart ${service.label}? This will briefly interrupt service.`,
      'stop': `Stop ${service.label}? Service will go offline.`,
    };

    if (!confirm(confirmMessages[action])) return;

    setActionLoading(action);
    try {
      const res = await fetch(`/api/operations/control/${service.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(`${action} failed: ${data.error}`);
      }
    } catch (error) {
      alert(`${action} request failed: ${(error as Error).message}`);
    } finally {
      setTimeout(() => setActionLoading(null), 2000);
    }
  };

  const status = health?.status || 'unknown';
  const statusColor = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.unknown;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed top-14 bottom-0 left-64 right-0 z-30"
        onClick={onClose}
      />
      <div className="fixed top-14 bottom-0 left-64 w-[400px] bg-gray-900 border-l border-gray-700 z-40 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: statusColor }}
              />
              <h3 className="text-lg font-semibold text-white">{service.label}</h3>
            </div>
            <div className="text-sm text-gray-400 mt-1">
              {service.port ? `Port ${service.port}` : 'No port'} - {service.description}
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
              {/* Overall Status */}
              <div className={`rounded-xl p-4 border ${
                status === 'online' ? 'bg-green-500/10 border-green-500/30' :
                status === 'degraded' ? 'bg-yellow-500/10 border-yellow-500/30' :
                'bg-red-500/10 border-red-500/30'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-400 uppercase tracking-wider">Status</div>
                    <div className={`text-2xl font-bold capitalize ${
                      status === 'online' ? 'text-green-400' :
                      status === 'degraded' ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {status}
                    </div>
                  </div>
                  <div className={`text-5xl ${
                    status === 'online' ? 'text-green-400' :
                    status === 'degraded' ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {status === 'online' ? '✓' : status === 'degraded' ? '⚠' : '✗'}
                  </div>
                </div>
              </div>

              {/* Uptime */}
              {health?.uptime && (
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Uptime</div>
                  <div className="text-xl font-bold text-white mt-1">{health.uptime}</div>
                </div>
              )}

              {/* CPU & Memory */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                  <div className="text-xs text-gray-500 uppercase tracking-wider">CPU</div>
                  <div className="text-2xl font-bold text-white mt-1">{health?.cpu ?? '-'}%</div>
                  {typeof health?.cpu === 'number' && (
                    <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          health.cpu > 80 ? 'bg-red-500' :
                          health.cpu > 60 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(health.cpu, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Memory</div>
                  <div className="text-2xl font-bold text-white mt-1">{health?.memory ?? '-'} MB</div>
                  {typeof health?.memory === 'number' && (
                    <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          health.memory > 500 ? 'bg-red-500' :
                          health.memory > 300 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${Math.min((health.memory / 1024) * 100, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Service Info */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Service Details</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Type</span>
                    <span className="text-white capitalize">{service.type.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Group</span>
                    <span className="text-white capitalize">{service.group.replace('_', ' ')}</span>
                  </div>
                  {service.pm2Name && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">PM2 Name</span>
                      <span className="text-white font-mono text-xs">{service.pm2Name}</span>
                    </div>
                  )}
                  {service.healthEndpoint && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Health Endpoint</span>
                      <span className="text-white font-mono text-xs">{service.healthEndpoint}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {service.pm2Name && (
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handleAction('start')}
                    disabled={actionLoading !== null}
                    className="py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-500 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === 'start' ? 'Starting...' : 'Start'}
                  </button>
                  <button
                    onClick={() => handleAction('restart')}
                    disabled={actionLoading !== null}
                    className="py-3 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-500 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === 'restart' ? 'Restarting...' : 'Restart'}
                  </button>
                  <button
                    onClick={() => handleAction('stop')}
                    disabled={actionLoading !== null}
                    className="py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-500 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === 'stop' ? 'Stopping...' : 'Stop'}
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
                  PM2 Logs - {service.pm2Name || 'N/A'}
                </div>
                <button
                  onClick={fetchLogs}
                  disabled={logLoading || !service.pm2Name}
                  className="px-3 py-1.5 text-xs bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  {logLoading ? 'Loading...' : 'Get Last 50 Lines'}
                </button>
              </div>

              {/* Logs Content */}
              <div ref={logContainerRef} className="flex-1 overflow-y-auto p-3 font-mono text-xs bg-black/30">
                {logLoading ? (
                  <div className="text-gray-500">Loading logs...</div>
                ) : logText ? (
                  <pre className="text-gray-300 whitespace-pre-wrap">{logText}</pre>
                ) : (
                  <div className="text-gray-500 text-center py-8">
                    {service.pm2Name ? (
                      <>
                        <p>Click &quot;Get Last 50 Lines&quot; to fetch PM2 logs</p>
                        <p className="text-gray-600 mt-2 text-xs">Process: {service.pm2Name}</p>
                      </>
                    ) : (
                      <p>No PM2 process configured for this service</p>
                    )}
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
