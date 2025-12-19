'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SourceCredential } from '../components/SourceCard';
import TradelineDropdown from '../components/TradelineDropdown';

// Local platforms
const LOCAL_PLATFORMS = [
  { key: 'planetbids', label: 'PlanetBids', icon: '🌐' },
  { key: 'opengov', label: 'OpenGov', icon: '📋' },
  { key: 'bidnet', label: 'BidNet', icon: '🔗' },
  { key: 'bonfire', label: 'Bonfire', icon: '🔥' },
  { key: 'publicpurchase', label: 'Public Purchase', icon: '🛒' },
];

interface Portal {
  id: string;
  name: string;
  platform: string;
  url?: string;
  state?: string;
  type: 'login';
  status: 'active' | 'expired' | 'expiring' | 'failed' | 'not_configured';
  username?: string;
  hasPassword?: boolean;
  lastChecked?: string;
  lastError?: string;
  categoryCount?: number;
  tradelines?: string[];
}

export default function LocalSourcesPage() {
  const [portals, setPortals] = useState<Portal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePlatform, setActivePlatform] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTradeline, setSelectedTradeline] = useState('all');

  useEffect(() => {
    fetchPortals();
  }, []);

  const fetchPortals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/patcher/portals');
      if (res.ok) {
        const data = await res.json();
        // Transform portal data to our format
        const transformed = (data.portals || []).map((p: any) => ({
          id: `${p.platform}_${p.id}`,
          name: p.name || p.id,
          platform: p.platform,
          url: p.path,
          type: 'login' as const,
          status: 'not_configured' as const,
          tradelines: [],
        }));
        setPortals(transformed);
      }
    } catch (e) {
      console.error('Failed to fetch portals:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async (source: SourceCredential) => {
    const [platform, portalId] = source.id.split('_');
    const res = await fetch(`/api/patcher/portals/${platform}/${portalId}/test`, {
      method: 'POST',
    });

    const data = await res.json();
    return { success: data.success, message: data.message || (data.success ? 'Login successful' : 'Login failed') };
  };

  // Filter portals
  const filteredPortals = portals.filter(p => {
    const matchesPlatform = !activePlatform || p.platform === activePlatform;
    const matchesSearch = !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.platform.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPlatform && matchesSearch;
  });

  // Count by platform
  const platformCounts = LOCAL_PLATFORMS.map(plat => ({
    ...plat,
    count: portals.filter(p => p.platform === plat.key).length,
    issues: portals.filter(p => p.platform === plat.key && (p.status === 'failed' || p.status === 'expired')).length,
  }));

  const configuredCount = portals.filter(p => p.status !== 'not_configured').length;
  const issueCount = portals.filter(p => p.status === 'failed' || p.status === 'expired').length;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-6 pb-0">
        {/* Search & Filter Bar */}
        <div className="flex items-center gap-4 mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search local portals..."
            className="flex-1 max-w-md bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
          <TradelineDropdown value={selectedTradeline} onChange={setSelectedTradeline} />
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="text-2xl">🏢</span>
            <span>{portals.length} portals</span>
            <span className="text-gray-600">|</span>
            <span className="text-green-400">{configuredCount} configured</span>
            {issueCount > 0 && (
              <>
                <span className="text-gray-600">|</span>
                <span className="text-red-400">{issueCount} issues</span>
              </>
            )}
          </div>
          <button
            onClick={fetchPortals}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {/* Platform Tabs */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
          <button
            onClick={() => setActivePlatform(null)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              !activePlatform
                ? 'bg-blue-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
            }`}
          >
            All Platforms ({portals.length})
          </button>
          {platformCounts.map((plat) => (
            <button
              key={plat.key}
              onClick={() => setActivePlatform(plat.key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-2 ${
                activePlatform === plat.key
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
              }`}
            >
              <span>{plat.icon}</span>
              {plat.label} ({plat.count})
              {plat.issues > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Portals Grid - Scrollable */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {loading ? (
          <div className="text-center text-gray-500 py-12">Loading local portals...</div>
        ) : filteredPortals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredPortals.map((portal) => (
              <Link
                key={portal.id}
                href={`/credentials/local/${portal.id}`}
                className={`border rounded-lg p-3 cursor-pointer transition-colors block ${
                  portal.status === 'active' ? 'bg-green-500/5 border-green-500/30 hover:border-green-500/50' :
                  portal.status === 'failed' || portal.status === 'expired' ? 'bg-red-500/5 border-red-500/30 hover:border-red-500/50' :
                  'bg-gray-800 border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${
                    portal.status === 'active' ? 'bg-green-500' :
                    portal.status === 'failed' || portal.status === 'expired' ? 'bg-red-500' :
                    portal.status === 'expiring' ? 'bg-yellow-500' : 'bg-gray-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white text-sm truncate">{portal.name}</div>
                    <div className="text-xs text-gray-500">{portal.platform}</div>
                  </div>
                </div>
                {portal.categoryCount !== undefined && (
                  <div className="text-xs text-gray-500">{portal.categoryCount} categories</div>
                )}
                {portal.lastError && (
                  <div className="text-xs text-red-400 truncate mt-1">{portal.lastError}</div>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-12">
            {searchQuery ? 'No portals match your search' : 'No portals found'}
          </div>
        )}
      </div>

      {/* Bulk Actions Footer */}
      <div className="flex-shrink-0 px-6 py-3 border-t border-gray-700 bg-gray-900/50 flex items-center gap-4">
        <span className="text-sm text-gray-500">
          Showing {filteredPortals.length} of {portals.length} portals
        </span>
        <div className="flex-1" />
        <button className="px-3 py-1.5 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600">
          Test All Logins
        </button>
        <button className="px-3 py-1.5 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600">
          Export Status
        </button>
      </div>
    </div>
  );
}
