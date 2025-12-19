'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// All tradelines
const TRADELINES = [
  { name: 'security', displayName: 'Security' },
  { name: 'administrative', displayName: 'Administrative' },
  { name: 'facilities', displayName: 'Facilities' },
  { name: 'logistics', displayName: 'Logistics' },
  { name: 'electrical', displayName: 'Electrical' },
  { name: 'lowvoltage', displayName: 'Low Voltage' },
  { name: 'landscaping', displayName: 'Landscaping' },
  { name: 'hvac', displayName: 'HVAC' },
  { name: 'plumbing', displayName: 'Plumbing' },
  { name: 'janitorial', displayName: 'Janitorial' },
  { name: 'support', displayName: 'Support' },
  { name: 'waste', displayName: 'Waste' },
  { name: 'construction', displayName: 'Construction' },
  { name: 'roofing', displayName: 'Roofing' },
  { name: 'painting', displayName: 'Painting' },
  { name: 'flooring', displayName: 'Flooring' },
  { name: 'demolition', displayName: 'Demolition' },
  { name: 'environmental', displayName: 'Environmental' },
  { name: 'concrete', displayName: 'Concrete' },
  { name: 'fencing', displayName: 'Fencing' },
];

// Actual source types from credentials.json
const SOURCE_TYPES = [
  { key: 'planetbid', label: 'PlanetBids' },
  { key: 'publicpurchase', label: 'Public Purchase' },
  { key: 'bidnet', label: 'BidNet' },
];

// API types from credentials.json
const API_TYPES = [
  { key: 'claude', label: 'Claude AI' },
  { key: 'openai', label: 'OpenAI' },
  { key: 'samgov', label: 'SAM.gov' },
];

interface NaicsCode {
  code: string;
  name: string;
}

interface PortalCategory {
  code: string;
  name: string;
}

interface PortalBundle {
  platform: string;
  portalId: string;
  name?: string;
  config?: { name?: string; url?: string };
  categories: PortalCategory[];
}

interface TradelineData {
  // From credentials.json
  credentials?: {
    ai_apis?: Record<string, { key?: string; status?: string; balance?: number; notes?: string }>;
    sources?: Record<string, { username?: string; password?: string; status?: string; notes?: string }>;
  };
  // From naics_psc.json
  naics_psc?: {
    naics_codes?: NaicsCode[];
    psc_codes?: NaicsCode[];
  };
  // From keywords_unspsc.json
  keywords_unspsc?: {
    keywords?: string[];
    unspsc_codes?: NaicsCode[];
  };
  // From portals sync
  portals?: PortalBundle[];
  error?: string;
}

export default function TradelineCredentialsPage() {
  const [data, setData] = useState<Record<string, TradelineData>>({});
  const [loading, setLoading] = useState(true);
  const [editingTradeline, setEditingTradeline] = useState<string | null>(null);
  const [selectedTradeline, setSelectedTradeline] = useState<string | null>(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    const newData: Record<string, TradelineData> = {};

    // Only fetch credentials and config initially - portals are loaded on demand
    await Promise.all(
      TRADELINES.map(async (t) => {
        try {
          const [credRes, configRes] = await Promise.all([
            fetch(`/api/patcher/credentials/${t.name}?raw=true`).catch(() => null),
            fetch(`/api/patcher/config/${t.name}`).catch(() => null),
          ]);

          const credData = credRes?.ok ? await credRes.json() : {};
          const configData = configRes?.ok ? await configRes.json() : {};

          newData[t.name] = {
            credentials: credData.credentials || {},
            naics_psc: configData.tradeline?.config?.naics_psc || {},
            keywords_unspsc: configData.tradeline?.config?.keywords_unspsc || {},
          };
        } catch (e) {
          newData[t.name] = { error: (e as Error).message };
        }
      })
    );

    setData(newData);
    setLoading(false);
  };

  // Fetch portals for a specific tradeline (on demand)
  const fetchPortals = async (tradeline: string) => {
    try {
      const res = await fetch(`/api/patcher/portals/sync/${tradeline}`);
      if (res.ok) {
        const portalsData = await res.json();
        setData(prev => ({
          ...prev,
          [tradeline]: {
            ...prev[tradeline],
            portals: portalsData.portals || [],
          }
        }));
      }
    } catch (e) {
      console.error('Failed to fetch portals:', e);
    }
  };

  // Load portals when tradeline is selected
  useEffect(() => {
    if (selectedTradeline && !data[selectedTradeline]?.portals) {
      fetchPortals(selectedTradeline);
    }
  }, [selectedTradeline]);

  // Count stats
  const countSources = (creds: TradelineData['credentials']) => {
    if (!creds?.sources) return 0;
    return Object.values(creds.sources).filter(s => s.username && s.password).length;
  };

  const countApis = (creds: TradelineData['credentials']) => {
    if (!creds?.ai_apis) return 0;
    return Object.values(creds.ai_apis).filter(a => a.key).length;
  };

  // Summary stats
  const totalNaics = Object.values(data).reduce((sum, d) =>
    sum + (d.naics_psc?.naics_codes?.length || 0), 0
  );
  const totalKeywords = Object.values(data).reduce((sum, d) =>
    sum + (d.keywords_unspsc?.keywords?.length || 0), 0
  );
  const totalApis = Object.values(data).reduce((sum, d) =>
    sum + countApis(d.credentials), 0
  );

  const selectedData = selectedTradeline ? data[selectedTradeline] : null;
  const selectedInfo = TRADELINES.find(t => t.name === selectedTradeline);

  return (
    <div className="flex h-full">
      {/* Left Panel - Tradeline List */}
      <div className="w-72 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <Link
            href="/servers/tradelines"
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-2"
          >
            <span>&larr;</span>
            <span>Back to Servers</span>
          </Link>
          <h2 className="text-xl font-semibold text-white">Credentials</h2>
          <p className="text-xs text-gray-500 mt-1">API keys, NAICS, keywords</p>
        </div>

        <div className="grid grid-cols-3 gap-2 p-4 border-b border-gray-700 bg-gray-800/30">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-400">{totalApis}</div>
            <div className="text-xs text-gray-500">APIs</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-400">{totalNaics}</div>
            <div className="text-xs text-gray-500">NAICS</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-purple-400">{totalKeywords}</div>
            <div className="text-xs text-gray-500">Keywords</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-gray-500 text-center">Loading from patcher...</div>
          ) : (
            TRADELINES.map((t) => {
              const tData = data[t.name];
              const apiCount = countApis(tData?.credentials);
              const naicsCount = tData?.naics_psc?.naics_codes?.length || 0;
              const keywordCount = tData?.keywords_unspsc?.keywords?.length || 0;
              const isSelected = selectedTradeline === t.name;

              return (
                <button
                  key={t.name}
                  onClick={() => setSelectedTradeline(t.name)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-800 transition-colors ${
                    isSelected
                      ? 'bg-blue-500/20 border-l-2 border-l-blue-500'
                      : 'hover:bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`font-medium ${isSelected ? 'text-blue-400' : 'text-white'}`}>
                        {t.displayName}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {apiCount} APIs, {naicsCount} NAICS, {keywordCount} keywords
                      </div>
                    </div>
                    {tData?.error && (
                      <div className="w-2 h-2 rounded-full bg-red-500" title={tData.error} />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="p-3 border-t border-gray-700">
          <button
            onClick={fetchAllData}
            disabled={loading}
            className="w-full py-2 text-sm font-medium bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh All'}
          </button>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedTradeline ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a tradeline to view its configuration
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 flex-shrink-0">
              <div>
                <h3 className="text-xl font-semibold text-white">{selectedInfo?.displayName}</h3>
                <p className="text-sm text-gray-500">{selectedTradeline}</p>
              </div>
              <button
                onClick={() => setEditingTradeline(selectedTradeline)}
                className="px-4 py-2 text-sm font-semibold bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Edit Configuration
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* AI APIs Section */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl">
                <div className="px-4 py-3 border-b border-gray-700">
                  <h4 className="font-medium text-white">AI APIs</h4>
                </div>
                <div className="p-4 grid grid-cols-3 gap-4">
                  {API_TYPES.map((api) => {
                    const apiData = selectedData?.credentials?.ai_apis?.[api.key];
                    const hasKey = !!apiData?.key;
                    const status = apiData?.status || 'not_configured';

                    return (
                      <div
                        key={api.key}
                        className={`p-3 rounded-lg border ${
                          hasKey
                            ? status === 'active' ? 'bg-green-500/10 border-green-500/30' : 'bg-yellow-500/10 border-yellow-500/30'
                            : 'bg-gray-900 border-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${hasKey ? 'bg-green-500' : 'bg-gray-600'}`} />
                          <span className={hasKey ? 'text-white' : 'text-gray-400'}>{api.label}</span>
                        </div>
                        {hasKey && apiData?.balance !== undefined && (
                          <div className="text-xs text-gray-400 mt-1 ml-4">${apiData.balance.toFixed(2)}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Source Logins Section */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl">
                <div className="px-4 py-3 border-b border-gray-700">
                  <h4 className="font-medium text-white">Source Logins</h4>
                </div>
                <div className="p-4 grid grid-cols-3 gap-4">
                  {SOURCE_TYPES.map((source) => {
                    const sourceData = selectedData?.credentials?.sources?.[source.key];
                    const isConfigured = sourceData?.username && sourceData?.password;
                    const status = sourceData?.status || 'not_configured';

                    return (
                      <div
                        key={source.key}
                        className={`p-3 rounded-lg border ${
                          isConfigured
                            ? status === 'active' ? 'bg-green-500/10 border-green-500/30' :
                              status === 'failed' ? 'bg-red-500/10 border-red-500/30' :
                              'bg-yellow-500/10 border-yellow-500/30'
                            : 'bg-gray-900 border-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${
                            isConfigured ? status === 'active' ? 'bg-green-500' : status === 'failed' ? 'bg-red-500' : 'bg-yellow-500' : 'bg-gray-600'
                          }`} />
                          <span className={isConfigured ? 'text-white' : 'text-gray-400'}>{source.label}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1 ml-4">
                          {isConfigured ? (status === 'active' ? 'Active' : status === 'failed' ? 'Failed' : 'Configured') : 'Not set'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* NAICS Codes Section */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl">
                <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
                  <h4 className="font-medium text-white">NAICS Codes</h4>
                  <span className="text-sm text-gray-500">{selectedData?.naics_psc?.naics_codes?.length || 0} codes</span>
                </div>
                <div className="p-4">
                  {selectedData?.naics_psc?.naics_codes && selectedData.naics_psc.naics_codes.length > 0 ? (
                    <div className="space-y-2">
                      {selectedData.naics_psc.naics_codes.map((item, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="px-2 py-1 text-xs font-mono bg-gray-700 text-green-400 rounded">{item.code}</span>
                          <span className="text-sm text-gray-400">{item.name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-sm">No NAICS codes configured</div>
                  )}
                </div>
              </div>

              {/* PSC Codes Section */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl">
                <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
                  <h4 className="font-medium text-white">PSC Codes</h4>
                  <span className="text-sm text-gray-500">{selectedData?.naics_psc?.psc_codes?.length || 0} codes</span>
                </div>
                <div className="p-4">
                  {selectedData?.naics_psc?.psc_codes && selectedData.naics_psc.psc_codes.length > 0 ? (
                    <div className="space-y-2">
                      {selectedData.naics_psc.psc_codes.map((item, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="px-2 py-1 text-xs font-mono bg-blue-500/20 text-blue-400 rounded">{item.code}</span>
                          <span className="text-sm text-gray-400">{item.name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-sm">No PSC codes configured</div>
                  )}
                </div>
              </div>

              {/* Keywords Section */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl">
                <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
                  <h4 className="font-medium text-white">Keywords</h4>
                  <span className="text-sm text-gray-500">{selectedData?.keywords_unspsc?.keywords?.length || 0} keywords</span>
                </div>
                <div className="p-4">
                  {selectedData?.keywords_unspsc?.keywords && selectedData.keywords_unspsc.keywords.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedData.keywords_unspsc.keywords.map((kw, i) => (
                        <span key={i} className="px-2 py-1 text-xs bg-purple-500/20 text-purple-300 rounded">{kw}</span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-sm">No keywords configured</div>
                  )}
                </div>
              </div>

              {/* UNSPSC Codes Section */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl">
                <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
                  <h4 className="font-medium text-white">UNSPSC Codes</h4>
                  <span className="text-sm text-gray-500">{selectedData?.keywords_unspsc?.unspsc_codes?.length || 0} codes</span>
                </div>
                <div className="p-4">
                  {selectedData?.keywords_unspsc?.unspsc_codes && selectedData.keywords_unspsc.unspsc_codes.length > 0 ? (
                    <div className="space-y-2">
                      {selectedData.keywords_unspsc.unspsc_codes.map((item, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="px-2 py-1 text-xs font-mono bg-orange-500/20 text-orange-400 rounded">{item.code}</span>
                          <span className="text-sm text-gray-400">{item.name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-sm">No UNSPSC codes configured</div>
                  )}
                </div>
              </div>

              {/* Portal Categories Section */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl">
                <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
                  <h4 className="font-medium text-white">Portal Categories</h4>
                  <span className="text-sm text-gray-500">
                    {selectedData?.portals ? `${selectedData.portals.length} portals` : 'Loading...'}
                  </span>
                </div>
                <div className="p-4">
                  {!selectedData?.portals ? (
                    <div className="text-gray-500 text-sm">Loading portal data...</div>
                  ) : selectedData.portals.length > 0 ? (
                    <div className="space-y-3">
                      {selectedData.portals.map((portal, i) => (
                        <div key={i} className="bg-gray-900 border border-gray-700 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 text-xs bg-cyan-500/20 text-cyan-400 rounded">
                                {portal.platform}
                              </span>
                              <span className="text-sm font-medium text-white">
                                {portal.config?.name || portal.portalId}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {portal.categories.length} categories
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {portal.categories.slice(0, 5).map((cat, j) => (
                              <span key={j} className="px-1.5 py-0.5 text-xs bg-gray-700 text-gray-400 rounded">
                                {cat.code}
                              </span>
                            ))}
                            {portal.categories.length > 5 && (
                              <span className="px-1.5 py-0.5 text-xs text-gray-500">
                                +{portal.categories.length - 5} more
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-sm">No portal categories configured for this tradeline</div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Editor Modal */}
      {editingTradeline && (
        <CredentialEditorModal
          tradeline={editingTradeline}
          initialData={data[editingTradeline]}
          onClose={() => setEditingTradeline(null)}
          onSave={() => {
            setEditingTradeline(null);
            fetchAllData();
          }}
        />
      )}
    </div>
  );
}

// Editor Modal
function CredentialEditorModal({
  tradeline,
  initialData,
  onClose,
  onSave,
}: {
  tradeline: string;
  initialData?: TradelineData;
  onClose: () => void;
  onSave: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('apis');
  const [activeApiTab, setActiveApiTab] = useState('claude');
  const [activeSourceTab, setActiveSourceTab] = useState('planetbid');
  const [showPasswords, setShowPasswords] = useState(false);

  // API keys state
  const [apis, setApis] = useState<Record<string, { key: string }>>(() => {
    const init: Record<string, { key: string }> = {};
    API_TYPES.forEach(a => {
      init[a.key] = { key: initialData?.credentials?.ai_apis?.[a.key]?.key || '' };
    });
    return init;
  });

  // Source credentials state
  const [sources, setSources] = useState<Record<string, { username: string; password: string }>>(() => {
    const init: Record<string, { username: string; password: string }> = {};
    SOURCE_TYPES.forEach(s => {
      const src = initialData?.credentials?.sources?.[s.key];
      init[s.key] = { username: src?.username || '', password: src?.password || '' };
    });
    return init;
  });

  // NAICS/Keywords state
  const [naicsCodes, setNaicsCodes] = useState<string>(
    (initialData?.naics_psc?.naics_codes || []).map(c => `${c.code} - ${c.name}`).join('\n')
  );
  const [pscCodes, setPscCodes] = useState<string>(
    (initialData?.naics_psc?.psc_codes || []).map(c => `${c.code} - ${c.name}`).join('\n')
  );
  const [keywords, setKeywords] = useState<string>(
    (initialData?.keywords_unspsc?.keywords || []).join('\n')
  );

  const sections = [
    { key: 'apis', label: 'AI APIs' },
    { key: 'sources', label: 'Source Logins' },
    { key: 'naics', label: 'NAICS/PSC' },
    { key: 'keywords', label: 'Keywords' },
  ];

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      // Build credentials update
      const credentialsUpdate = {
        ai_apis: Object.fromEntries(
          Object.entries(apis).map(([key, val]) => [key, { ...initialData?.credentials?.ai_apis?.[key], key: val.key }])
        ),
        sources: Object.fromEntries(
          Object.entries(sources).map(([key, val]) => [
            key,
            { ...initialData?.credentials?.sources?.[key], ...val, status: val.username && val.password ? 'configured' : 'not_configured' }
          ])
        )
      };

      const credRes = await fetch(`/api/patcher/credentials/${tradeline}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentialsUpdate),
      });

      if (!credRes.ok) {
        const errData = await credRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to save credentials');
      }

      onSave();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const tradelineInfo = TRADELINES.find((t) => t.name === tradeline);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-8">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-white">Edit {tradelineInfo?.displayName || tradeline}</h3>
            <p className="text-xs text-gray-500">APIs, source logins, NAICS, keywords</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
        </div>

        <div className="flex border-b border-gray-700 bg-gray-800/50">
          {sections.map((section) => (
            <button
              key={section.key}
              onClick={() => setActiveSection(section.key)}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeSection === section.key ? 'text-white bg-gray-700 border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-6">
          {error && (
            <div className="bg-red-500/15 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-4">{error}</div>
          )}

          {/* AI APIs Section */}
          {activeSection === 'apis' && (
            <div>
              <div className="flex gap-2 mb-4">
                {API_TYPES.map((type) => (
                  <button
                    key={type.key}
                    onClick={() => setActiveApiTab(type.key)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg ${
                      activeApiTab === type.key ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                <input type="checkbox" checked={showPasswords} onChange={(e) => setShowPasswords(e.target.checked)} className="rounded bg-gray-700" />
                Show API keys
              </label>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">API Key</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={apis[activeApiTab]?.key || ''}
                  onChange={(e) => setApis(prev => ({ ...prev, [activeApiTab]: { key: e.target.value } }))}
                  placeholder="Enter API key"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white font-mono text-sm"
                />
              </div>
            </div>
          )}

          {/* Source Logins Section */}
          {activeSection === 'sources' && (
            <div>
              <div className="flex gap-2 mb-4">
                {SOURCE_TYPES.map((type) => (
                  <button
                    key={type.key}
                    onClick={() => setActiveSourceTab(type.key)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg ${
                      activeSourceTab === type.key ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                <input type="checkbox" checked={showPasswords} onChange={(e) => setShowPasswords(e.target.checked)} className="rounded bg-gray-700" />
                Show passwords
              </label>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Username</label>
                  <input
                    type="text"
                    value={sources[activeSourceTab]?.username || ''}
                    onChange={(e) => setSources(prev => ({ ...prev, [activeSourceTab]: { ...prev[activeSourceTab], username: e.target.value } }))}
                    placeholder="Enter username"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Password</label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={sources[activeSourceTab]?.password || ''}
                    onChange={(e) => setSources(prev => ({ ...prev, [activeSourceTab]: { ...prev[activeSourceTab], password: e.target.value } }))}
                    placeholder="Enter password"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* NAICS/PSC Section */}
          {activeSection === 'naics' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">NAICS Codes (code - name, one per line)</label>
                <textarea
                  value={naicsCodes}
                  onChange={(e) => setNaicsCodes(e.target.value)}
                  placeholder="541330 - Engineering Services"
                  rows={8}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">PSC Codes (code - name, one per line)</label>
                <textarea
                  value={pscCodes}
                  onChange={(e) => setPscCodes(e.target.value)}
                  placeholder="J017 - Maintenance of Alarm Systems"
                  rows={8}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono text-sm"
                />
              </div>
            </div>
          )}

          {/* Keywords Section */}
          {activeSection === 'keywords' && (
            <div>
              <p className="text-sm text-gray-400 mb-4">Enter keywords, one per line.</p>
              <textarea
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="fire alarm&#10;security system"
                rows={12}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-2">{keywords.split('\n').filter(Boolean).length} keywords</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save & Push to Server'}
          </button>
        </div>
      </div>
    </div>
  );
}
