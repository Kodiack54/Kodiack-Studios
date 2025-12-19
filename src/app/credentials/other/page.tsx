'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SourceCredential } from '../components/SourceCard';
import TradelineDropdown from '../components/TradelineDropdown';

// Other source categories
const OTHER_CATEGORIES = [
  { key: 'universities', label: 'Universities', icon: '🎓' },
  { key: 'healthcare', label: 'Healthcare', icon: '🏥' },
  { key: 'private', label: 'Private Sector', icon: '🏢' },
  { key: 'associations', label: 'Associations', icon: '🤝' },
  { key: 'international', label: 'International', icon: '🌍' },
  { key: 'nonprofits', label: 'Non-Profits', icon: '💚' },
];

// Sample other sources
const OTHER_SOURCES = [
  // Universities
  { id: 'uc_system', name: 'UC System', category: 'universities', platform: 'University of California', type: 'login' as const },
  { id: 'csu_system', name: 'CSU System', category: 'universities', platform: 'California State University', type: 'login' as const },
  { id: 'mit', name: 'MIT', category: 'universities', platform: 'Massachusetts Institute of Tech', type: 'login' as const },
  { id: 'stanford', name: 'Stanford', category: 'universities', platform: 'Stanford University', type: 'login' as const },
  { id: 'harvard', name: 'Harvard', category: 'universities', platform: 'Harvard University', type: 'login' as const },
  { id: 'yale', name: 'Yale', category: 'universities', platform: 'Yale University', type: 'login' as const },
  { id: 'columbia', name: 'Columbia', category: 'universities', platform: 'Columbia University', type: 'login' as const },
  { id: 'ut_system', name: 'UT System', category: 'universities', platform: 'University of Texas', type: 'login' as const },
  { id: 'suny', name: 'SUNY', category: 'universities', platform: 'State Univ of New York', type: 'login' as const },
  { id: 'cuny', name: 'CUNY', category: 'universities', platform: 'City Univ of New York', type: 'login' as const },
  { id: 'uw_system', name: 'UW System', category: 'universities', platform: 'University of Washington', type: 'login' as const },
  { id: 'penn_state', name: 'Penn State', category: 'universities', platform: 'Pennsylvania State Univ', type: 'login' as const },

  // Healthcare
  { id: 'kaiser', name: 'Kaiser Permanente', category: 'healthcare', platform: 'Kaiser Procurement', type: 'login' as const },
  { id: 'hca', name: 'HCA Healthcare', category: 'healthcare', platform: 'HCA Procurement', type: 'login' as const },
  { id: 'ascension', name: 'Ascension', category: 'healthcare', platform: 'Ascension Health', type: 'login' as const },
  { id: 'commonspirit', name: 'CommonSpirit', category: 'healthcare', platform: 'CommonSpirit Health', type: 'login' as const },
  { id: 'providence', name: 'Providence', category: 'healthcare', platform: 'Providence Health', type: 'login' as const },
  { id: 'sutter', name: 'Sutter Health', category: 'healthcare', platform: 'Sutter Health', type: 'login' as const },
  { id: 'dignity', name: 'Dignity Health', category: 'healthcare', platform: 'Dignity Health', type: 'login' as const },

  // Private Sector
  { id: 'ariba', name: 'SAP Ariba', category: 'private', platform: 'SAP Ariba Network', type: 'login' as const },
  { id: 'coupa', name: 'Coupa', category: 'private', platform: 'Coupa Supplier Portal', type: 'login' as const },
  { id: 'jaggaer', name: 'Jaggaer', category: 'private', platform: 'Jaggaer', type: 'login' as const },
  { id: 'ivalua', name: 'Ivalua', category: 'private', platform: 'Ivalua Platform', type: 'login' as const },
  { id: 'oracle_isupplier', name: 'Oracle iSupplier', category: 'private', platform: 'Oracle', type: 'login' as const },
  { id: 'workday', name: 'Workday', category: 'private', platform: 'Workday Strategic Sourcing', type: 'login' as const },

  // Associations
  { id: 'omnia', name: 'OMNIA Partners', category: 'associations', platform: 'OMNIA Partners', type: 'login' as const },
  { id: 'sourcewell', name: 'Sourcewell', category: 'associations', platform: 'Sourcewell', type: 'login' as const },
  { id: 'naspo', name: 'NASPO ValuePoint', category: 'associations', platform: 'NASPO', type: 'login' as const },
  { id: 'ncpa', name: 'NCPA', category: 'associations', platform: 'National Cooperative Purchasing', type: 'login' as const },
  { id: 'tips', name: 'TIPS', category: 'associations', platform: 'The Interlocal Purchasing', type: 'login' as const },
  { id: 'buyboard', name: 'BuyBoard', category: 'associations', platform: 'BuyBoard Cooperative', type: 'login' as const },
  { id: 'hgac', name: 'HGAC Buy', category: 'associations', platform: 'Houston-Galveston Area', type: 'login' as const },
  { id: 'uscommunities', name: 'US Communities', category: 'associations', platform: 'US Communities', type: 'login' as const },

  // International
  { id: 'merx', name: 'MERX', category: 'international', platform: 'Canadian Public Tenders', type: 'login' as const },
  { id: 'buyandsell', name: 'Buy and Sell', category: 'international', platform: 'Canada Buy and Sell', type: 'login' as const },
  { id: 'ted', name: 'TED', category: 'international', platform: 'Tenders Electronic Daily (EU)', type: 'login' as const },
  { id: 'ungm', name: 'UNGM', category: 'international', platform: 'UN Global Marketplace', type: 'login' as const },
  { id: 'devex', name: 'Devex', category: 'international', platform: 'Development Opportunities', type: 'login' as const },

  // Non-Profits
  { id: 'techsoup', name: 'TechSoup', category: 'nonprofits', platform: 'TechSoup', type: 'login' as const },
  { id: 'redcross', name: 'Red Cross', category: 'nonprofits', platform: 'American Red Cross', type: 'login' as const },
  { id: 'salvation_army', name: 'Salvation Army', category: 'nonprofits', platform: 'Salvation Army', type: 'login' as const },
  { id: 'habitat', name: 'Habitat for Humanity', category: 'nonprofits', platform: 'Habitat for Humanity', type: 'login' as const },
];

export default function OtherSourcesPage() {
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
      const res = await fetch('/api/patcher/sources/other');
      if (res.ok) {
        const data = await res.json();
        setSources(data.sources || []);
      } else {
        // Use defaults with not_configured status
        setSources(OTHER_SOURCES.map(s => ({
          ...s,
          status: 'not_configured' as const,
          tradelines: [],
        })));
      }
    } catch (e) {
      console.error('Failed to fetch other sources:', e);
      setSources(OTHER_SOURCES.map(s => ({
        ...s,
        status: 'not_configured' as const,
        tradelines: [],
      })));
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async (source: SourceCredential) => {
    const res = await fetch(`/api/patcher/sources/other/${source.id}/test`, {
      method: 'POST',
    });

    const data = await res.json();
    return { success: data.success, message: data.message || (data.success ? 'Login successful' : 'Login failed') };
  };

  const getSourcesByCategory = (categoryKey: string) => {
    return sources.filter(s => {
      const otherSource = OTHER_SOURCES.find(os => os.id === s.id);
      return otherSource?.category === categoryKey;
    });
  };

  // Filter sources
  const filteredSources = sources.filter(s => {
    const otherSource = OTHER_SOURCES.find(os => os.id === s.id);
    const matchesCategory = !activeCategory || otherSource?.category === activeCategory;
    const matchesSearch = !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.platform.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Category counts
  const categoryCounts = OTHER_CATEGORIES.map(cat => ({
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
            placeholder="Search other sources..."
            className="flex-1 max-w-md bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
          <TradelineDropdown value={selectedTradeline} onChange={setSelectedTradeline} />
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="text-2xl">📦</span>
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
          <div className="text-center text-gray-500 py-12">Loading sources...</div>
        ) : filteredSources.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredSources.map((source) => {
              const otherSource = OTHER_SOURCES.find(os => os.id === source.id);
              const category = OTHER_CATEGORIES.find(c => c.key === otherSource?.category);
              return (
                <Link
                  key={source.id}
                  href={`/credentials/other/${source.id}`}
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
