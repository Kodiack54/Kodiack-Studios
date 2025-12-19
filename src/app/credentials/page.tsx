'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import TradelineDropdown from './components/TradelineDropdown';

interface CredentialAlert {
  tradeline: string;
  level: 'warning' | 'critical';
  type?: string;
  name?: string;
  message: string;
}

interface SourceStats {
  federal: { total: number; configured: number; issues: number };
  state: { total: number; configured: number; issues: number };
  local: { total: number; configured: number; issues: number };
  municipal: { total: number; configured: number; issues: number };
  other: { total: number; configured: number; issues: number };
}

export default function CredentialsOverviewPage() {
  const [alerts, setAlerts] = useState<CredentialAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedTradeline, setSelectedTradeline] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<SourceStats>({
    federal: { total: 15, configured: 3, issues: 0 },
    state: { total: 50, configured: 1, issues: 0 },
    local: { total: 350, configured: 10, issues: 2 },
    municipal: { total: 100, configured: 0, issues: 0 },
    other: { total: 25, configured: 0, issues: 0 },
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/patcher/credentials/alerts');
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
      }
    } catch (e) {
      console.error('Failed to fetch alerts:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      await fetch('/api/patcher/credentials/sync', { method: 'POST' });
      await fetchData();
    } catch (e) {
      console.error('Sync failed:', e);
    } finally {
      setSyncing(false);
    }
  };

  // Filter alerts by tradeline
  const filteredAlerts = alerts.filter(a =>
    selectedTradeline === 'all' || a.tradeline === selectedTradeline
  );

  const criticalAlerts = filteredAlerts.filter(a => a.level === 'critical');
  const warningAlerts = filteredAlerts.filter(a => a.level === 'warning');

  const categoryCards = [
    {
      key: 'federal',
      label: 'Federal',
      path: '/credentials/federal',
      icon: '🏛️',
      sources: ['SAM.gov', 'DoD', 'GSA', '12 Labs'],
      stats: stats.federal,
    },
    {
      key: 'state',
      label: 'State',
      path: '/credentials/state',
      icon: '🗺️',
      sources: ['CaleProcure', 'Texas SmartBuy', '48 more states'],
      stats: stats.state,
    },
    {
      key: 'local',
      label: 'Local',
      path: '/credentials/local',
      icon: '🏢',
      sources: ['PlanetBids (350+)', 'OpenGov', 'BidNet'],
      stats: stats.local,
    },
    {
      key: 'municipal',
      label: 'Municipal',
      path: '/credentials/municipal',
      icon: '⚡',
      sources: ['Energy Districts', 'Transit', 'Water', 'Utilities'],
      stats: stats.municipal,
    },
    {
      key: 'other',
      label: 'Other',
      path: '/credentials/other',
      icon: '📦',
      sources: ['Universities', 'Private', 'Associations'],
      stats: stats.other,
    },
  ];

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Search & Filter Bar */}
      <div className="flex items-center gap-4 mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search sources..."
          className="flex-1 max-w-md bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
        />
        <TradelineDropdown value={selectedTradeline} onChange={setSelectedTradeline} />
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Alerts Section */}
      {(criticalAlerts.length > 0 || warningAlerts.length > 0) && (
        <div className="mb-6 space-y-3">
          {criticalAlerts.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <h3 className="text-red-400 font-semibold mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Critical Issues ({criticalAlerts.length})
              </h3>
              <div className="space-y-2">
                {criticalAlerts.slice(0, 5).map((alert, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 text-xs bg-gray-700 rounded text-gray-300">{alert.tradeline}</span>
                      <span className="text-red-300">{alert.message}</span>
                    </div>
                    <button className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30">
                      Fix Now
                    </button>
                  </div>
                ))}
                {criticalAlerts.length > 5 && (
                  <div className="text-xs text-red-400 pt-2">+{criticalAlerts.length - 5} more critical issues</div>
                )}
              </div>
            </div>
          )}

          {warningAlerts.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
              <h3 className="text-yellow-400 font-semibold mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                Warnings ({warningAlerts.length})
              </h3>
              <div className="space-y-2">
                {warningAlerts.slice(0, 3).map((alert, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 text-xs bg-gray-700 rounded text-gray-300">{alert.tradeline}</span>
                      <span className="text-yellow-300">{alert.message}</span>
                    </div>
                    <button className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30">
                      Review
                    </button>
                  </div>
                ))}
                {warningAlerts.length > 3 && (
                  <div className="text-xs text-yellow-400 pt-2">+{warningAlerts.length - 3} more warnings</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* No Alerts */}
      {criticalAlerts.length === 0 && warningAlerts.length === 0 && !loading && (
        <div className="mb-6 bg-green-500/10 border border-green-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-green-400">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="font-medium">All credentials healthy</span>
          </div>
        </div>
      )}

      {/* Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {categoryCards.map((cat) => (
          <Link
            key={cat.key}
            href={cat.path}
            className="bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-gray-600 transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{cat.icon}</span>
                <div>
                  <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                    {cat.label}
                  </h3>
                  <p className="text-xs text-gray-500">{cat.stats.total} sources</p>
                </div>
              </div>
              {cat.stats.issues > 0 && (
                <div className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">
                  {cat.stats.issues} issues
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Configured</span>
                <span>{cat.stats.configured}/{cat.stats.total}</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${(cat.stats.configured / cat.stats.total) * 100}%` }}
                />
              </div>
            </div>

            {/* Source Tags */}
            <div className="flex flex-wrap gap-1.5">
              {cat.sources.map((source, i) => (
                <span key={i} className="px-2 py-0.5 text-xs bg-gray-700/50 text-gray-400 rounded">
                  {source}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Quick Actions</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={handleSyncAll}
          disabled={syncing}
          className="p-4 bg-gray-800 border border-gray-700 rounded-xl text-left hover:border-blue-500/50 hover:bg-gray-800/80 transition-colors disabled:opacity-50"
        >
          <div className="text-2xl mb-2">{syncing ? '⏳' : '🔄'}</div>
          <div className="text-sm font-medium text-white">{syncing ? 'Syncing...' : 'Sync All'}</div>
          <div className="text-xs text-gray-500">Pull latest from patcher</div>
        </button>
        <button className="p-4 bg-gray-800 border border-gray-700 rounded-xl text-left hover:border-green-500/50 hover:bg-gray-800/80 transition-colors">
          <div className="text-2xl mb-2">📤</div>
          <div className="text-sm font-medium text-white">Push Changes</div>
          <div className="text-xs text-gray-500">Deploy to all servers</div>
        </button>
        <button className="p-4 bg-gray-800 border border-gray-700 rounded-xl text-left hover:border-purple-500/50 hover:bg-gray-800/80 transition-colors">
          <div className="text-2xl mb-2">🔐</div>
          <div className="text-sm font-medium text-white">Test Logins</div>
          <div className="text-xs text-gray-500">Verify all credentials</div>
        </button>
        <button className="p-4 bg-gray-800 border border-gray-700 rounded-xl text-left hover:border-orange-500/50 hover:bg-gray-800/80 transition-colors">
          <div className="text-2xl mb-2">📊</div>
          <div className="text-sm font-medium text-white">Export Report</div>
          <div className="text-xs text-gray-500">Credential status CSV</div>
        </button>
      </div>
    </div>
  );
}
