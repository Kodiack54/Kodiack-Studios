'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SourceCredential } from '../components/SourceCard';
import TradelineDropdown from '../components/TradelineDropdown';

// Municipal source categories
const MUNICIPAL_CATEGORIES = [
  { key: 'energy', label: 'Energy Districts', icon: '⚡' },
  { key: 'transit', label: 'Transit Authorities', icon: '🚌' },
  { key: 'water', label: 'Water Districts', icon: '💧' },
  { key: 'utilities', label: 'Utilities', icon: '🔌' },
  { key: 'ports', label: 'Ports & Airports', icon: '✈️' },
  { key: 'housing', label: 'Housing Authorities', icon: '🏠' },
];

// Sample municipal sources - will be populated from patcher
const MUNICIPAL_SOURCES = [
  // Energy Districts
  { id: 'smud', name: 'Sacramento Municipal Utility District', category: 'energy', platform: 'California', type: 'login' as const },
  { id: 'ladwp', name: 'Los Angeles Dept of Water & Power', category: 'energy', platform: 'California', type: 'login' as const },
  { id: 'pge', name: 'Pacific Gas & Electric', category: 'energy', platform: 'California', type: 'login' as const },
  { id: 'sce', name: 'Southern California Edison', category: 'energy', platform: 'California', type: 'login' as const },
  { id: 'sdge', name: 'San Diego Gas & Electric', category: 'energy', platform: 'California', type: 'login' as const },
  { id: 'aps', name: 'Arizona Public Service', category: 'energy', platform: 'Arizona', type: 'login' as const },
  { id: 'nvenergy', name: 'NV Energy', category: 'energy', platform: 'Nevada', type: 'login' as const },
  { id: 'xcel', name: 'Xcel Energy', category: 'energy', platform: 'Multi-State', type: 'login' as const },

  // Transit
  { id: 'la_metro', name: 'Los Angeles Metro', category: 'transit', platform: 'California', type: 'login' as const },
  { id: 'bart', name: 'Bay Area Rapid Transit', category: 'transit', platform: 'California', type: 'login' as const },
  { id: 'sacrt', name: 'Sacramento Regional Transit', category: 'transit', platform: 'California', type: 'login' as const },
  { id: 'mta_ny', name: 'New York Metropolitan Transit Authority', category: 'transit', platform: 'New York', type: 'login' as const },
  { id: 'cta', name: 'Chicago Transit Authority', category: 'transit', platform: 'Illinois', type: 'login' as const },
  { id: 'mbta', name: 'Massachusetts Bay Transportation Authority', category: 'transit', platform: 'Massachusetts', type: 'login' as const },
  { id: 'septa', name: 'Southeastern Pennsylvania Transportation', category: 'transit', platform: 'Pennsylvania', type: 'login' as const },
  { id: 'wmata', name: 'Washington Metropolitan Area Transit', category: 'transit', platform: 'DC Metro', type: 'login' as const },
  { id: 'trimet', name: 'Portland Tri-County Metropolitan Transit', category: 'transit', platform: 'Oregon', type: 'login' as const },
  { id: 'rtd', name: 'Denver Regional Transportation District', category: 'transit', platform: 'Colorado', type: 'login' as const },
  { id: 'dart', name: 'Dallas Area Rapid Transit', category: 'transit', platform: 'Texas', type: 'login' as const },
  { id: 'nctd', name: 'North County Transit District', category: 'transit', platform: 'California', type: 'login' as const },

  // Water Districts
  { id: 'mwd', name: 'Metropolitan Water District of Southern California', category: 'water', platform: 'California', type: 'login' as const },
  { id: 'ebmud', name: 'East Bay Municipal Utility District', category: 'water', platform: 'California', type: 'login' as const },
  { id: 'sfpuc', name: 'San Francisco Public Utilities Commission', category: 'water', platform: 'California', type: 'login' as const },
  { id: 'lvvwd', name: 'Las Vegas Valley Water District', category: 'water', platform: 'Nevada', type: 'login' as const },
  { id: 'snwa', name: 'Southern Nevada Water Authority', category: 'water', platform: 'Nevada', type: 'login' as const },
  { id: 'denverwater', name: 'Denver Water', category: 'water', platform: 'Colorado', type: 'login' as const },
  { id: 'phoenixwater', name: 'Phoenix Water Services Department', category: 'water', platform: 'Arizona', type: 'login' as const },
  { id: 'ieua', name: 'Inland Empire Utilities Agency', category: 'water', platform: 'California', type: 'login' as const },

  // Utilities
  { id: 'att', name: 'AT&T Procurement', category: 'utilities', platform: 'National', type: 'login' as const },
  { id: 'verizon', name: 'Verizon Procurement', category: 'utilities', platform: 'National', type: 'login' as const },
  { id: 'comcast', name: 'Comcast Procurement', category: 'utilities', platform: 'National', type: 'login' as const },
  { id: 'centurylink', name: 'CenturyLink / Lumen', category: 'utilities', platform: 'National', type: 'login' as const },

  // Ports & Airports
  { id: 'port_la', name: 'Port of Los Angeles', category: 'ports', platform: 'California', type: 'login' as const },
  { id: 'port_lb', name: 'Port of Long Beach', category: 'ports', platform: 'California', type: 'login' as const },
  { id: 'port_oakland', name: 'Port of Oakland', category: 'ports', platform: 'California', type: 'login' as const },
  { id: 'port_seattle', name: 'Port of Seattle', category: 'ports', platform: 'Washington', type: 'login' as const },
  { id: 'lawa', name: 'Los Angeles World Airports', category: 'ports', platform: 'California', type: 'login' as const },
  { id: 'sfo', name: 'San Francisco International Airport', category: 'ports', platform: 'California', type: 'login' as const },
  { id: 'panynj', name: 'Port Authority of New York & New Jersey', category: 'ports', platform: 'New York', type: 'login' as const },
  { id: 'massport', name: 'Massachusetts Port Authority', category: 'ports', platform: 'Massachusetts', type: 'login' as const },

  // Housing
  { id: 'hacla', name: 'Housing Authority of Los Angeles', category: 'housing', platform: 'California', type: 'login' as const },
  { id: 'nycha', name: 'New York City Housing Authority', category: 'housing', platform: 'New York', type: 'login' as const },
  { id: 'cha', name: 'Chicago Housing Authority', category: 'housing', platform: 'Illinois', type: 'login' as const },
  { id: 'pha', name: 'Philadelphia Housing Authority', category: 'housing', platform: 'Pennsylvania', type: 'login' as const },
  { id: 'sfha', name: 'San Francisco Housing Authority', category: 'housing', platform: 'California', type: 'login' as const },
];

export default function MunicipalSourcesPage() {
  const [sources, setSources] = useState<SourceCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTradeline, setSelectedTradeline] = useState('all');

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/patcher/sources/municipal');
      if (res.ok) {
        const data = await res.json();
        setSources(data.sources || []);
      } else {
        // Use defaults with not_configured status
        setSources(MUNICIPAL_SOURCES.map(s => ({
          ...s,
          status: 'not_configured' as const,
          tradelines: [],
        })));
      }
    } catch (e) {
      console.error('Failed to fetch municipal sources:', e);
      setSources(MUNICIPAL_SOURCES.map(s => ({
        ...s,
        status: 'not_configured' as const,
        tradelines: [],
      })));
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async (source: SourceCredential) => {
    const res = await fetch(`/api/patcher/sources/municipal/${source.id}/test`, {
      method: 'POST',
    });

    const data = await res.json();
    return { success: data.success, message: data.message || (data.success ? 'Login successful' : 'Login failed') };
  };

  const getSourcesByCategory = (categoryKey: string) => {
    return sources.filter(s => {
      const municipalSource = MUNICIPAL_SOURCES.find(ms => ms.id === s.id);
      return municipalSource?.category === categoryKey;
    });
  };

  // Filter sources
  const filteredSources = sources.filter(s => {
    const municipalSource = MUNICIPAL_SOURCES.find(ms => ms.id === s.id);
    const matchesCategory = !activeCategory || municipalSource?.category === activeCategory;
    const matchesSearch = !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.platform.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Category counts
  const categoryCounts = MUNICIPAL_CATEGORIES.map(cat => ({
    ...cat,
    count: getSourcesByCategory(cat.key).length,
    issues: getSourcesByCategory(cat.key).filter(s => s.status === 'failed' || s.status === 'expired').length,
  }));

  const configuredCount = sources.filter(s => s.status !== 'not_configured').length;
  const issueCount = sources.filter(s => s.status === 'failed' || s.status === 'expired').length;

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
            placeholder="Search municipal sources..."
            className="flex-1 max-w-md bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
          <TradelineDropdown value={selectedTradeline} onChange={setSelectedTradeline} />
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="text-2xl">⚡</span>
            <span>{sources.length} sources</span>
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
            onClick={fetchSources}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              !activeCategory
                ? 'bg-blue-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
            }`}
          >
            All ({sources.length})
          </button>
          {categoryCounts.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-2 ${
                activeCategory === cat.key
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
              }`}
            >
              <span>{cat.icon}</span>
              {cat.label} ({cat.count})
              {cat.issues > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Sources Grid - Scrollable */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {loading ? (
          <div className="text-center text-gray-500 py-12">Loading municipal sources...</div>
        ) : filteredSources.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredSources.map((source) => {
              const municipalSource = MUNICIPAL_SOURCES.find(ms => ms.id === source.id);
              const category = MUNICIPAL_CATEGORIES.find(c => c.key === municipalSource?.category);
              return (
                <Link
                  key={source.id}
                  href={`/credentials/municipal/${source.id}`}
                  className={`border rounded-lg p-3 cursor-pointer transition-colors block ${
                    source.status === 'active' ? 'bg-green-500/5 border-green-500/30 hover:border-green-500/50' :
                    source.status === 'failed' || source.status === 'expired' ? 'bg-red-500/5 border-red-500/30 hover:border-red-500/50' :
                    'bg-gray-800 border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${
                      source.status === 'active' ? 'bg-green-500' :
                      source.status === 'failed' || source.status === 'expired' ? 'bg-red-500' :
                      source.status === 'expiring' ? 'bg-yellow-500' : 'bg-gray-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white text-sm truncate">{source.name}</div>
                      <div className="text-xs text-gray-500">{source.platform}</div>
                    </div>
                    {category && (
                      <span className="text-sm">{category.icon}</span>
                    )}
                  </div>
                  {source.username && (
                    <div className="text-xs text-gray-500 truncate">{source.username}</div>
                  )}
                  {source.lastError && (
                    <div className="text-xs text-red-400 truncate mt-1">{source.lastError}</div>
                  )}
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-12">
            {searchQuery ? 'No sources match your search' : 'No sources found'}
          </div>
        )}
      </div>

      {/* Bulk Actions Footer */}
      <div className="flex-shrink-0 px-6 py-3 border-t border-gray-700 bg-gray-900/50 flex items-center gap-4">
        <span className="text-sm text-gray-500">
          Showing {filteredSources.length} of {sources.length} sources
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
