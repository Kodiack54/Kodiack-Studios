'use client';

import { useState, useEffect } from 'react';
import SourceCard, { SourceCredential } from '../components/SourceCard';
import TradelineDropdown from '../components/TradelineDropdown';

// Federal source definitions
const FEDERAL_SOURCES = [
  { id: 'sam_gov', name: 'SAM.gov', platform: 'Federal - Contracts', type: 'api_key' as const },
  { id: 'fpds', name: 'FPDS', platform: 'Federal - Data', type: 'api_key' as const },
  { id: 'usaspending', name: 'USASpending', platform: 'Federal - Data', type: 'api_key' as const },
  { id: 'gsa_ebuy', name: 'GSA eBuy', platform: 'Federal - GSA', type: 'login' as const },
  { id: 'gsa_advantage', name: 'GSA Advantage', platform: 'Federal - GSA', type: 'login' as const },
  { id: 'dod_emall', name: 'DoD eMall', platform: 'Federal - DoD', type: 'login' as const },
  { id: 'army_mil', name: 'Army.mil', platform: 'Federal - DoD', type: 'login' as const },
  { id: 'navy_mil', name: 'Navy.mil', platform: 'Federal - DoD', type: 'login' as const },
  { id: 'af_mil', name: 'AF.mil', platform: 'Federal - DoD', type: 'login' as const },
  { id: 'dla', name: 'DLA', platform: 'Federal - DoD', type: 'login' as const },
  // Labs
  { id: 'sandia', name: 'Sandia Labs', platform: 'Federal - Labs', type: 'login' as const },
  { id: 'lanl', name: 'Los Alamos (LANL)', platform: 'Federal - Labs', type: 'login' as const },
  { id: 'llnl', name: 'Lawrence Livermore (LLNL)', platform: 'Federal - Labs', type: 'login' as const },
  { id: 'ornl', name: 'Oak Ridge (ORNL)', platform: 'Federal - Labs', type: 'login' as const },
  { id: 'pnnl', name: 'Pacific Northwest (PNNL)', platform: 'Federal - Labs', type: 'login' as const },
];

// Group sources by category
const FEDERAL_CATEGORIES = [
  { key: 'contracts', label: 'Contracts & Data', sources: ['sam_gov', 'fpds', 'usaspending'] },
  { key: 'gsa', label: 'GSA', sources: ['gsa_ebuy', 'gsa_advantage'] },
  { key: 'dod', label: 'DoD', sources: ['dod_emall', 'army_mil', 'navy_mil', 'af_mil', 'dla'] },
  { key: 'labs', label: 'National Labs', sources: ['sandia', 'lanl', 'llnl', 'ornl', 'pnnl'] },
];

export default function FederalSourcesPage() {
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
      // Fetch from patcher - would need an endpoint for federal sources
      const res = await fetch('/api/patcher/sources/federal');
      if (res.ok) {
        const data = await res.json();
        setSources(data.sources || []);
      } else {
        // Use defaults with not_configured status
        setSources(FEDERAL_SOURCES.map(s => ({
          ...s,
          status: 'not_configured' as const,
          tradelines: [],
        })));
      }
    } catch (e) {
      console.error('Failed to fetch federal sources:', e);
      setSources(FEDERAL_SOURCES.map(s => ({
        ...s,
        status: 'not_configured' as const,
        tradelines: [],
      })));
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async (source: SourceCredential) => {
    const res = await fetch(`/api/patcher/sources/federal/${source.id}/test`, {
      method: 'POST',
    });

    const data = await res.json();
    return { success: data.success, message: data.message || (data.success ? 'Connection successful' : 'Connection failed') };
  };

  const getSourcesByCategory = (categoryKey: string) => {
    const category = FEDERAL_CATEGORIES.find(c => c.key === categoryKey);
    if (!category) return [];
    return sources.filter(s => category.sources.includes(s.id));
  };

  // Filter sources by category and search
  const filteredSources = sources.filter(s => {
    const matchesCategory = !activeCategory ||
      FEDERAL_CATEGORIES.find(c => c.key === activeCategory)?.sources.includes(s.id);
    const matchesSearch = !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.platform.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const configuredCount = sources.filter(s => s.status !== 'not_configured').length;
  const issueCount = sources.filter(s => s.status === 'failed' || s.status === 'expired').length;

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Search & Filter Bar */}
      <div className="flex items-center gap-4 mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search federal sources..."
          className="flex-1 max-w-md bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
        />
        <TradelineDropdown value={selectedTradeline} onChange={setSelectedTradeline} />
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span className="text-2xl">🏛️</span>
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

      {/* Category Filters */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            !activeCategory
              ? 'bg-blue-500 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
          }`}
        >
          All ({sources.length})
        </button>
        {FEDERAL_CATEGORIES.map((cat) => {
          const catSources = getSourcesByCategory(cat.key);
          const catIssues = catSources.filter(s => s.status === 'failed' || s.status === 'expired').length;

          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                activeCategory === cat.key
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
              }`}
            >
              {cat.label} ({catSources.length})
              {catIssues > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Sources Grid */}
      {loading ? (
        <div className="text-center text-gray-500 py-12">Loading federal sources...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSources.map((source) => (
            <SourceCard
              key={source.id}
              source={source}
              href={`/credentials/federal/${source.id}`}
              onTest={handleTest}
            />
          ))}
        </div>
      )}

      {filteredSources.length === 0 && !loading && (
        <div className="text-center text-gray-500 py-12">
          No sources found in this category
        </div>
      )}
    </div>
  );
}
