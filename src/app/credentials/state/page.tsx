'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SourceCredential } from '../components/SourceCard';
import TradelineDropdown from '../components/TradelineDropdown';

// US States with their procurement systems
const STATE_SOURCES = [
  // Major states with known systems
  { id: 'ca_caleprocure', name: 'CaleProcure', state: 'CA', platform: 'California', type: 'login' as const },
  { id: 'ca_caltrans', name: 'Caltrans', state: 'CA', platform: 'California', type: 'login' as const },
  { id: 'tx_smartbuy', name: 'Texas SmartBuy', state: 'TX', platform: 'Texas', type: 'login' as const },
  { id: 'tx_txmas', name: 'TXMAS', state: 'TX', platform: 'Texas', type: 'login' as const },
  { id: 'ny_ogs', name: 'OGS Procurement', state: 'NY', platform: 'New York', type: 'login' as const },
  { id: 'ny_nyc_pac', name: 'NYC PAC', state: 'NY', platform: 'New York', type: 'login' as const },
  { id: 'fl_myflorida', name: 'MyFloridaMarketPlace', state: 'FL', platform: 'Florida', type: 'login' as const },
  { id: 'pa_emarket', name: 'PA eMarketplace', state: 'PA', platform: 'Pennsylvania', type: 'login' as const },
  { id: 'il_bidonline', name: 'BidBuyIllinois', state: 'IL', platform: 'Illinois', type: 'login' as const },
  { id: 'oh_procure', name: 'Ohio Procurement', state: 'OH', platform: 'Ohio', type: 'login' as const },
  { id: 'ga_tps', name: 'Georgia TPS', state: 'GA', platform: 'Georgia', type: 'login' as const },
  { id: 'nc_ips', name: 'NC IPS', state: 'NC', platform: 'North Carolina', type: 'login' as const },
  { id: 'mi_sigma', name: 'SIGMA', state: 'MI', platform: 'Michigan', type: 'login' as const },
  { id: 'nj_njstart', name: 'NJSTART', state: 'NJ', platform: 'New Jersey', type: 'login' as const },
  { id: 'va_eva', name: 'eVA', state: 'VA', platform: 'Virginia', type: 'login' as const },
  { id: 'wa_webs', name: 'WEBS', state: 'WA', platform: 'Washington', type: 'login' as const },
  { id: 'az_procure', name: 'AZ Procure', state: 'AZ', platform: 'Arizona', type: 'login' as const },
  { id: 'ma_commbuys', name: 'COMMBUYS', state: 'MA', platform: 'Massachusetts', type: 'login' as const },
  { id: 'tn_edison', name: 'Edison', state: 'TN', platform: 'Tennessee', type: 'login' as const },
  { id: 'md_emaryland', name: 'eMaryland', state: 'MD', platform: 'Maryland', type: 'login' as const },
  { id: 'in_buyindiana', name: 'BuyIndiana', state: 'IN', platform: 'Indiana', type: 'login' as const },
  { id: 'mo_missouribuys', name: 'MissouriBUYS', state: 'MO', platform: 'Missouri', type: 'login' as const },
  { id: 'wi_vendornet', name: 'VendorNet', state: 'WI', platform: 'Wisconsin', type: 'login' as const },
  { id: 'mn_swift', name: 'SWIFT', state: 'MN', platform: 'Minnesota', type: 'login' as const },
  { id: 'co_bidscolorado', name: 'BIDS Colorado', state: 'CO', platform: 'Colorado', type: 'login' as const },
  { id: 'sc_procurement', name: 'SC Procurement', state: 'SC', platform: 'South Carolina', type: 'login' as const },
  { id: 'al_procure', name: 'Alabama Procure', state: 'AL', platform: 'Alabama', type: 'login' as const },
  { id: 'la_lagovercart', name: 'LaGov', state: 'LA', platform: 'Louisiana', type: 'login' as const },
  { id: 'ky_emars', name: 'eMARS', state: 'KY', platform: 'Kentucky', type: 'login' as const },
  { id: 'or_orpin', name: 'ORPIN', state: 'OR', platform: 'Oregon', type: 'login' as const },
  { id: 'ok_omes', name: 'OMES Procurement', state: 'OK', platform: 'Oklahoma', type: 'login' as const },
  { id: 'ct_biznet', name: 'CT BizNet', state: 'CT', platform: 'Connecticut', type: 'login' as const },
  { id: 'ut_buyutah', name: 'BuyUtah', state: 'UT', platform: 'Utah', type: 'login' as const },
  { id: 'ia_bidopportunities', name: 'IA Bid Opportunities', state: 'IA', platform: 'Iowa', type: 'login' as const },
  { id: 'nv_purchasing', name: 'Nevada Purchasing', state: 'NV', platform: 'Nevada', type: 'login' as const },
  { id: 'ar_procurement', name: 'Arkansas Procurement', state: 'AR', platform: 'Arkansas', type: 'login' as const },
  { id: 'ms_magic', name: 'MAGIC', state: 'MS', platform: 'Mississippi', type: 'login' as const },
  { id: 'ks_procurement', name: 'Kansas Procurement', state: 'KS', platform: 'Kansas', type: 'login' as const },
  { id: 'nm_procurement', name: 'NM Procurement', state: 'NM', platform: 'New Mexico', type: 'login' as const },
  { id: 'ne_das', name: 'NE DAS', state: 'NE', platform: 'Nebraska', type: 'login' as const },
  { id: 'wv_wvpurchasing', name: 'WV Purchasing', state: 'WV', platform: 'West Virginia', type: 'login' as const },
  { id: 'id_purchasing', name: 'Idaho Purchasing', state: 'ID', platform: 'Idaho', type: 'login' as const },
  { id: 'hi_hands', name: 'Hawaii HANDS', state: 'HI', platform: 'Hawaii', type: 'login' as const },
  { id: 'nh_purchasing', name: 'NH Purchasing', state: 'NH', platform: 'New Hampshire', type: 'login' as const },
  { id: 'me_procurement', name: 'Maine Procurement', state: 'ME', platform: 'Maine', type: 'login' as const },
  { id: 'ri_purchasing', name: 'RI Purchasing', state: 'RI', platform: 'Rhode Island', type: 'login' as const },
  { id: 'mt_purchasing', name: 'Montana Purchasing', state: 'MT', platform: 'Montana', type: 'login' as const },
  { id: 'de_marketplace', name: 'Delaware Marketplace', state: 'DE', platform: 'Delaware', type: 'login' as const },
  { id: 'sd_procurement', name: 'SD Procurement', state: 'SD', platform: 'South Dakota', type: 'login' as const },
  { id: 'nd_procurement', name: 'ND Procurement', state: 'ND', platform: 'North Dakota', type: 'login' as const },
  { id: 'ak_iris', name: 'Alaska IRIS', state: 'AK', platform: 'Alaska', type: 'login' as const },
  { id: 'vt_purchasing', name: 'Vermont Purchasing', state: 'VT', platform: 'Vermont', type: 'login' as const },
  { id: 'wy_procurement', name: 'Wyoming Procurement', state: 'WY', platform: 'Wyoming', type: 'login' as const },
];

// Group by region
const REGIONS = [
  { key: 'west', label: 'West', states: ['CA', 'WA', 'OR', 'NV', 'AZ', 'UT', 'CO', 'NM', 'AK', 'HI', 'ID', 'MT', 'WY'] },
  { key: 'midwest', label: 'Midwest', states: ['TX', 'OK', 'KS', 'NE', 'SD', 'ND', 'MN', 'IA', 'MO', 'AR', 'LA'] },
  { key: 'great_lakes', label: 'Great Lakes', states: ['IL', 'IN', 'OH', 'MI', 'WI'] },
  { key: 'southeast', label: 'Southeast', states: ['FL', 'GA', 'SC', 'NC', 'VA', 'WV', 'KY', 'TN', 'AL', 'MS'] },
  { key: 'northeast', label: 'Northeast', states: ['NY', 'PA', 'NJ', 'CT', 'MA', 'RI', 'NH', 'VT', 'ME', 'MD', 'DE'] },
];

export default function StateSourcesPage() {
  const [sources, setSources] = useState<SourceCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRegion, setActiveRegion] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTradeline, setSelectedTradeline] = useState('all');

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/patcher/sources/state');
      if (res.ok) {
        const data = await res.json();
        setSources(data.sources || []);
      } else {
        // Use defaults with not_configured status
        setSources(STATE_SOURCES.map(s => ({
          ...s,
          status: 'not_configured' as const,
          tradelines: [],
        })));
      }
    } catch (e) {
      console.error('Failed to fetch state sources:', e);
      setSources(STATE_SOURCES.map(s => ({
        ...s,
        status: 'not_configured' as const,
        tradelines: [],
      })));
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async (source: SourceCredential) => {
    const res = await fetch(`/api/patcher/sources/state/${source.id}/test`, {
      method: 'POST',
    });

    const data = await res.json();
    return { success: data.success, message: data.message || (data.success ? 'Login successful' : 'Login failed') };
  };

  const getSourcesByRegion = (regionKey: string) => {
    const region = REGIONS.find(r => r.key === regionKey);
    if (!region) return [];
    return sources.filter(s => {
      const stateSource = STATE_SOURCES.find(ss => ss.id === s.id);
      return stateSource && region.states.includes(stateSource.state);
    });
  };

  // Filter sources
  const filteredSources = sources.filter(s => {
    const stateSource = STATE_SOURCES.find(ss => ss.id === s.id);
    const matchesRegion = !activeRegion || (stateSource && REGIONS.find(r => r.key === activeRegion)?.states.includes(stateSource.state));
    const matchesSearch = !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.platform.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (stateSource?.state.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesRegion && matchesSearch;
  });

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
            placeholder="Search states or systems..."
            className="flex-1 max-w-md bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
          <TradelineDropdown value={selectedTradeline} onChange={setSelectedTradeline} />
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="text-2xl">🗺️</span>
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

        {/* Region Tabs */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveRegion(null)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              !activeRegion
                ? 'bg-blue-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
            }`}
          >
            All States ({sources.length})
          </button>
          {REGIONS.map((region) => {
            const regionSources = getSourcesByRegion(region.key);
            const regionIssues = regionSources.filter(s => s.status === 'failed' || s.status === 'expired').length;

            return (
              <button
                key={region.key}
                onClick={() => setActiveRegion(region.key)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-2 ${
                  activeRegion === region.key
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
                }`}
              >
                {region.label} ({regionSources.length})
                {regionIssues > 0 && (
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sources Grid - Scrollable */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {loading ? (
          <div className="text-center text-gray-500 py-12">Loading state sources...</div>
        ) : filteredSources.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredSources.map((source) => {
              const stateSource = STATE_SOURCES.find(ss => ss.id === source.id);
              return (
                <Link
                  key={source.id}
                  href={`/credentials/state/${source.id}`}
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
                      <div className="text-xs text-gray-500">{stateSource?.state} - {source.platform}</div>
                    </div>
                    {stateSource && (
                      <span className="px-1.5 py-0.5 text-xs bg-gray-700 text-gray-400 rounded font-mono">
                        {stateSource.state}
                      </span>
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
            {searchQuery ? 'No states match your search' : 'No state sources found'}
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
