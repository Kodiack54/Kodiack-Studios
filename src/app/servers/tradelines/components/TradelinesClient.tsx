'use client';

import { useState, useEffect, useContext } from 'react';
import { PageTitleContext, PageActionsContext } from '@/app/layout';
import ServerListItem from './ServerListItem';
import ServerDetailPanel from './ServerDetailPanel';
import ServerStatsPanel from './ServerStatsPanel';
import LiveFeedPanel from './LiveFeedPanel';
import TerminalPanel from './TerminalPanel';

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
  slotId?: string;
  processes?: Process[];
}

interface TradelineAnalytics {
  name: string;
  storageBytes: number;
  storage: string;
  documents: number;
  opportunities: number;
}

interface AnalyticsData {
  tradelines?: TradelineAnalytics[];
}

interface TradelinesClientProps {
  tradelines: Tradeline[];
  healthAll: {
    tradelines?: Record<string, TradelineHealth>;
  };
  analytics: AnalyticsData | null;
  initialError: string | null;
}

type WorkerType = 'main' | 'w1' | 'w2' | 'w3' | 'w4';

// Worker tab definitions - suffix is computed dynamically from slotId
const WORKER_TAB_DEFS: { id: WorkerType; label: string; offset: number }[] = [
  { id: 'main', label: 'Engine', offset: 0 },
  { id: 'w1', label: 'Discovery', offset: 1 },
  { id: 'w2', label: 'Scope', offset: 2 },
  { id: 'w3', label: 'Research', offset: 3 },
  { id: 'w4', label: 'Assistant', offset: 4 },
];

// Get worker tabs with dynamic suffix based on selected tradeline's slotId
function getWorkerTabs(slotId: string | undefined): { id: WorkerType; label: string; suffix: string }[] {
  const slot = slotId || '00';
  return WORKER_TAB_DEFS.map(tab => ({
    id: tab.id,
    label: tab.label,
    suffix: tab.offset === 0 ? slot : `${tab.offset}${slot}`,
  }));
}

export default function TradelinesClient({ tradelines, healthAll, analytics, initialError }: TradelinesClientProps) {
  const [error, setError] = useState<string | null>(initialError);
  const [selectedTradeline, setSelectedTradeline] = useState<Tradeline | null>(
    tradelines.length > 0 ? tradelines[0] : null
  );
  const [activeTab, setActiveTab] = useState<'feed' | 'terminal'>('feed');
  const [activeWorker, setActiveWorker] = useState<WorkerType>('main');

  const setPageTitle = useContext(PageTitleContext);
  const setPageActions = useContext(PageActionsContext);

  // Set page title
  useEffect(() => {
    setPageTitle({
      title: 'Tradeline Servers',
      description: '7101 - NextBid Engine Patcher - Manage all 20 tradeline servers',
    });

    // No bulk actions in header anymore - moved to sidebar
    setPageActions(null);

    return () => setPageActions(null);
  }, [setPageTitle, setPageActions]);

  // Get health for selected tradeline
  const getHealth = (name: string): TradelineHealth => {
    return healthAll.tradelines?.[name] || { status: 'stopped', online: 0, total: 4, processes: [] };
  };

  // Get analytics for a tradeline (storage, docs, ops)
  const getAnalytics = (name: string): TradelineAnalytics | null => {
    return analytics?.tradelines?.find(t => t.name === name) || null;
  };

  const selectedHealth = selectedTradeline ? getHealth(selectedTradeline.name) : null;
  const selectedPort = selectedTradeline?.ports?.main || 0;

  return (
    <div className="h-full flex flex-col -mt-4 overflow-hidden">
      {/* Error Alert */}
      {error && (
        <div className="flex-shrink-0 bg-red-500/15 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mx-4 mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Top Row: Server List (3/4) + Stats Panel (1/4) */}
      <div className="flex-shrink-0 flex gap-4 mx-4">
        {/* Server List - 3/4 width, fixed height */}
        <div className="w-3/4 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden h-[280px] flex flex-col">
          <div className="flex-shrink-0 bg-black/30 px-4 py-2 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-xs uppercase text-gray-500 font-medium tracking-wide">
              Tradeline Servers ({tradelines.length})
            </h3>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                {tradelines.filter(t => getHealth(t.name).status === 'healthy').length} Healthy
              </span>
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                {tradelines.filter(t => getHealth(t.name).status === 'partial').length} Partial
              </span>
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                {tradelines.filter(t => getHealth(t.name).status === 'stopped' || !getHealth(t.name).status).length} Stopped
              </span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-700/50">
            {tradelines.map((t) => {
              const health = getHealth(t.name);
              const tradelineAnalytics = getAnalytics(t.name);
              return (
                <ServerListItem
                  key={t.name}
                  name={t.name}
                  displayName={t.displayName}
                  port={t.ports?.main || 0}
                  status={health.status || 'stopped'}
                  online={health.online || 0}
                  total={health.total || 4}
                  processes={health.processes || []}
                  storageBytes={tradelineAnalytics?.storageBytes || 0}
                  isSelected={selectedTradeline?.name === t.name}
                  onClick={() => setSelectedTradeline(t)}
                />
              );
            })}
          </div>
        </div>

        {/* Stats Panel - 1/4 width, fixed height to match server list */}
        <div className="w-1/4 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden h-[280px]">
          {selectedTradeline ? (
            <ServerDetailPanel
              tradeline={selectedTradeline.name}
              displayName={selectedTradeline.displayName}
              port={selectedPort}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm p-4">
              Select a server
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Empty Stats Box + Feed/Terminal */}
      {selectedTradeline && (
        <div className="flex-1 min-h-0 mt-4 mx-4 flex gap-4 overflow-hidden">
          {/* Left: Per-Server Stats Panel */}
          <div className="w-80 flex-shrink-0 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
            <ServerStatsPanel tradeline={selectedTradeline.name} />
          </div>

          {/* Right: Feed + Terminal Tabs */}
          <div className="flex-1 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden flex flex-col">
            {/* Tabs: Live Feed + Worker Tabs | Terminal (right) */}
            <div className="flex-shrink-0 flex items-center border-b border-gray-700 bg-black/30">
              <button
                onClick={() => setActiveTab('feed')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'feed'
                    ? 'text-white border-b-2 border-blue-500 bg-gray-800/50'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Live Feed
              </button>

              {/* Divider */}
              <div className="w-px h-6 bg-gray-700 mx-1" />

              {/* Worker tabs - only show when feed is active */}
              {activeTab === 'feed' && getWorkerTabs(selectedHealth?.slotId).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveWorker(tab.id)}
                  className={`px-3 py-2 text-xs font-medium transition-colors ${
                    activeWorker === tab.id
                      ? 'text-blue-400 bg-blue-500/10'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {tab.label}
                  <span className="ml-1 text-gray-600 text-[10px]">{tab.suffix}</span>
                </button>
              ))}

              {/* Spacer */}
              <div className="flex-1" />

              {/* Terminal on the right */}
              <button
                onClick={() => setActiveTab('terminal')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'terminal'
                    ? 'text-white border-b-2 border-blue-500 bg-gray-800/50'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Terminal
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {activeTab === 'feed' ? (
                <LiveFeedPanel tradeline={selectedTradeline.name} activeWorker={activeWorker} />
              ) : (
                <TerminalPanel tradeline={selectedTradeline.name} port={selectedPort} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedTradeline && (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          Select a server from the list above to view details
        </div>
      )}
    </div>
  );
}
