'use client';

import { useState } from 'react';
import TradelineActions from '../../components/TradelineActions';
import LogsViewer from '../../components/LogsViewer';

interface TradelineDetailProps {
  tradeline: string;
  tradelineInfo: any;
  status: any;
  config: any;
}

export default function TradelineDetail({
  tradeline,
  tradelineInfo,
  status,
  config,
}: TradelineDetailProps) {
  const [showLogs, setShowLogs] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'config' | 'workers'>('overview');

  const statusClass = status?.status || 'stopped';

  const statusColors: Record<string, string> = {
    healthy: 'bg-green-500',
    partial: 'bg-yellow-500',
    stopped: 'bg-red-500',
    degraded: 'bg-orange-500',
  };

  const statusTextColors: Record<string, string> = {
    healthy: 'text-green-400',
    partial: 'text-yellow-400',
    stopped: 'text-red-400',
    degraded: 'text-orange-400',
  };

  return (
    <div>
      {/* Logs Modal */}
      {showLogs && (
        <LogsViewer tradeline={tradeline} onClose={() => setShowLogs(false)} />
      )}

      {/* Status Card */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-4 h-4 rounded-full ${statusColors[statusClass]}`} />
            <span className={`text-lg font-semibold ${statusTextColors[statusClass]}`}>
              {statusClass.charAt(0).toUpperCase() + statusClass.slice(1)}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {status?.online || 0} / {status?.total || 5} processes online
          </div>
          <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${statusColors[statusClass]} transition-all`}
              style={{ width: `${((status?.online || 0) / (status?.total || 5)) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Main Port</div>
          <div className="font-mono text-2xl text-blue-400">
            {tradelineInfo?.ports?.main || 'N/A'}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Workers: {tradelineInfo?.ports?.worker1}, {tradelineInfo?.ports?.worker2},
            {tradelineInfo?.ports?.worker3}, {tradelineInfo?.ports?.worker4}
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">Actions</div>
          <div className="space-y-2">
            <TradelineActions tradeline={tradeline} />
            <button
              onClick={() => setShowLogs(true)}
              className="w-full px-3 py-1.5 text-xs font-semibold rounded bg-gray-700 text-gray-400 hover:text-white transition-colors"
            >
              View Logs
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700 mb-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'config'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Configuration
        </button>
        <button
          onClick={() => setActiveTab('workers')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'workers'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Workers
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-2 gap-6">
          {/* Discovery Stats */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Discovery Statistics</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Opportunities Found</span>
                <span className="text-white font-mono">{status?.stats?.opportunities || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Last Discovery Run</span>
                <span className="text-white font-mono">{status?.stats?.lastRun || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Next Scheduled</span>
                <span className="text-white font-mono">{status?.stats?.nextRun || '-'}</span>
              </div>
            </div>
          </div>

          {/* API Status */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">API Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">SAM.gov</span>
                <span className={`text-xs px-2 py-1 rounded ${
                  status?.apis?.sam_gov ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'
                }`}>
                  {status?.apis?.sam_gov ? 'Connected' : 'Not configured'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">GovWin</span>
                <span className={`text-xs px-2 py-1 rounded ${
                  status?.apis?.govwin ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'
                }`}>
                  {status?.apis?.govwin ? 'Connected' : 'Not configured'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">PlanetBids</span>
                <span className={`text-xs px-2 py-1 rounded ${
                  status?.apis?.planetbids ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'
                }`}>
                  {status?.apis?.planetbids ? 'Connected' : 'Not configured'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'config' && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Configuration</h3>
          <pre className="font-mono text-xs text-gray-300 bg-black/30 p-4 rounded-lg overflow-auto max-h-96">
            {config ? JSON.stringify(config, null, 2) : 'No configuration loaded'}
          </pre>
        </div>
      )}

      {activeTab === 'workers' && (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((workerNum) => {
            const portKey = `worker${workerNum}` as keyof typeof tradelineInfo.ports;
            const workerPort = tradelineInfo?.ports?.[portKey];
            const workerStatus = status?.workers?.[workerNum - 1] || {};

            return (
              <div
                key={workerNum}
                className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${
                    workerStatus.online ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <div>
                    <div className="font-medium text-white">Worker {workerNum}</div>
                    <div className="text-xs text-gray-500">Port {workerPort}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-xs text-gray-400">
                    {workerStatus.tasks || 0} tasks processed
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    workerStatus.online
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {workerStatus.online ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
