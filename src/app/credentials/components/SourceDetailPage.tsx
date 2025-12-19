'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface SourceConfig {
  id: string;
  name: string;
  displayName?: string;
  platform: string;
  type: 'login' | 'api_key' | 'oauth';
  status: 'active' | 'expired' | 'expiring' | 'failed' | 'not_configured';
  username?: string;
  hasPassword?: boolean;
  apiKey?: string;
  expiresAt?: string;
  lastChecked?: string;
  lastError?: string;
  // Codes
  naicsCodes?: { code: string; name: string }[];
  pscCodes?: { code: string; name: string }[];
  unspscCodes?: { code: string; name: string }[];
  keywords?: string[];
  // Portal categories (for PlanetBids, etc.)
  categories?: { id: string; name: string; selected: boolean }[];
  availableCategories?: { id: string; name: string; parent?: string }[];
}

interface SourceDetailPageProps {
  sourceId: string;
  category: 'federal' | 'state' | 'local' | 'municipal' | 'other';
  backPath: string;
  showPscCodes?: boolean;
  showCategories?: boolean;
}

const TABS = [
  { key: 'credentials', label: 'Credentials', icon: '🔑' },
  { key: 'naics', label: 'NAICS Codes', icon: '📋' },
  { key: 'psc', label: 'PSC Codes', icon: '🏛️' },
  { key: 'unspsc', label: 'UNSPSC Codes', icon: '🏷️' },
  { key: 'keywords', label: 'Keywords', icon: '🔍' },
  { key: 'categories', label: 'Categories', icon: '📂' },
];

export default function SourceDetailPage({
  sourceId,
  category,
  backPath,
  showPscCodes = false,
  showCategories = false,
}: SourceDetailPageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [activeTab, setActiveTab] = useState('credentials');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Source data
  const [source, setSource] = useState<SourceConfig | null>(null);

  // Editable fields
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Codes - stored as text for editing, one per line
  const [naicsText, setNaicsText] = useState('');
  const [pscText, setPscText] = useState('');
  const [unspscText, setUnspscText] = useState('');
  const [keywordsText, setKeywordsText] = useState('');

  // Categories
  const [categorySearch, setCategorySearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [availableCategories, setAvailableCategories] = useState<{ id: string; name: string; parent?: string }[]>([]);

  // Filter tabs based on what's enabled
  const visibleTabs = TABS.filter(tab => {
    if (tab.key === 'psc' && !showPscCodes) return false;
    if (tab.key === 'categories' && !showCategories) return false;
    return true;
  });

  useEffect(() => {
    fetchSource();
  }, [sourceId, category]);

  const fetchSource = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/patcher/sources/${category}/${sourceId}`);
      if (res.ok) {
        const data = await res.json();
        setSource(data.source);

        // Populate form fields
        setDisplayName(data.source.displayName || data.source.name || '');
        setUsername(data.source.username || '');
        setApiKey(data.source.apiKey || '');
        setExpiresAt(data.source.expiresAt?.split('T')[0] || '');

        // Codes
        if (data.source.naicsCodes) {
          setNaicsText(data.source.naicsCodes.map((c: any) => `${c.code} - ${c.name}`).join('\n'));
        }
        if (data.source.pscCodes) {
          setPscText(data.source.pscCodes.map((c: any) => `${c.code} - ${c.name}`).join('\n'));
        }
        if (data.source.unspscCodes) {
          setUnspscText(data.source.unspscCodes.map((c: any) => `${c.code} - ${c.name}`).join('\n'));
        }
        if (data.source.keywords) {
          setKeywordsText(data.source.keywords.join('\n'));
        }

        // Categories
        if (data.source.categories) {
          const selected = new Set<string>(data.source.categories.filter((c: any) => c.selected).map((c: any) => c.id));
          setSelectedCategories(selected);
        }
        if (data.source.availableCategories) {
          setAvailableCategories(data.source.availableCategories);
        }
      } else {
        // Create default source structure
        setSource({
          id: sourceId,
          name: sourceId,
          platform: category,
          type: 'login',
          status: 'not_configured',
        });
        setDisplayName(sourceId);
      }
    } catch (e) {
      console.error('Failed to fetch source:', e);
      setError('Failed to load source configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Parse codes from text
      const parseCodeLines = (text: string) => {
        return text.split('\n')
          .map(line => line.trim())
          .filter(Boolean)
          .map(line => {
            const [code, ...nameParts] = line.split(' - ');
            return { code: code.trim(), name: nameParts.join(' - ').trim() || code.trim() };
          });
      };

      const updates = {
        displayName,
        username: username || undefined,
        password: password || undefined,
        apiKey: apiKey || undefined,
        expiresAt: expiresAt || undefined,
        naicsCodes: parseCodeLines(naicsText),
        pscCodes: showPscCodes ? parseCodeLines(pscText) : undefined,
        unspscCodes: parseCodeLines(unspscText),
        keywords: keywordsText.split('\n').map(k => k.trim()).filter(Boolean),
        selectedCategories: showCategories ? Array.from(selectedCategories) : undefined,
      };

      const res = await fetch(`/api/patcher/sources/${category}/${sourceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        throw new Error('Failed to save configuration');
      }

      setSuccess('Configuration saved successfully!');
      setPassword(''); // Clear password after save
      await fetchSource(); // Refresh data
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch(`/api/patcher/sources/${category}/${sourceId}/test`, {
        method: 'POST',
      });
      const data = await res.json();
      setTestResult({ success: data.success, message: data.message || (data.success ? 'Connection successful!' : 'Connection failed') });
    } catch (e) {
      setTestResult({ success: false, message: (e as Error).message });
    } finally {
      setTesting(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const filteredCategories = availableCategories.filter(cat =>
    cat.name.toLowerCase().includes(categorySearch.toLowerCase()) ||
    cat.id.toLowerCase().includes(categorySearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-400">Loading source configuration...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-gray-700 bg-gray-800/50">
        <div className="flex items-center gap-4 mb-4">
          <Link
            href={backPath}
            className="px-3 py-1.5 text-sm bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
          >
            ← Back
          </Link>
          <div className="flex-1">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="text-2xl font-bold bg-transparent text-white border-b border-transparent hover:border-gray-600 focus:border-blue-500 focus:outline-none w-full max-w-lg"
              placeholder="Source name..."
            />
            <p className="text-sm text-gray-500 mt-1">{source?.platform} • {source?.id}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-lg text-sm ${
              source?.status === 'active' ? 'bg-green-500/20 text-green-400' :
              source?.status === 'failed' || source?.status === 'expired' ? 'bg-red-500/20 text-red-400' :
              'bg-gray-700 text-gray-400'
            }`}>
              {source?.status || 'not_configured'}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {visibleTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'bg-gray-900 text-white border-t border-l border-r border-gray-700'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Messages */}
        {error && (
          <div className="mb-4 bg-red-500/15 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 bg-green-500/15 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg text-sm">
            {success}
          </div>
        )}
        {testResult && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${
            testResult.success
              ? 'bg-green-500/15 border border-green-500/30 text-green-400'
              : 'bg-red-500/15 border border-red-500/30 text-red-400'
          }`}>
            {testResult.message}
          </div>
        )}

        {/* Credentials Tab */}
        {activeTab === 'credentials' && (
          <div className="max-w-2xl space-y-6">
            {source?.type === 'login' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    autoComplete="username"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={source.hasPassword ? '••••••••' : 'Enter password'}
                      autoComplete="current-password"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none pr-20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 hover:text-gray-400"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {source.hasPassword && !password && (
                    <p className="text-xs text-gray-500 mt-1">Leave blank to keep existing password</p>
                  )}
                </div>
              </>
            )}

            {source?.type === 'api_key' && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">API Key</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter API key"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none font-mono text-sm pr-20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 hover:text-gray-400"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Expiration Date (optional)</label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleTest}
                disabled={testing || source?.status === 'not_configured'}
                className="px-4 py-2 text-sm font-medium bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
            </div>

            {source?.lastChecked && (
              <p className="text-xs text-gray-500">
                Last checked: {new Date(source.lastChecked).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* NAICS Codes Tab */}
        {activeTab === 'naics' && (
          <div className="max-w-3xl">
            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-2">
                Enter NAICS codes, one per line. Format: <code className="bg-gray-800 px-1 rounded">CODE - Description</code>
              </p>
              <p className="text-xs text-gray-500">
                Example: 541330 - Engineering Services
              </p>
            </div>
            <textarea
              value={naicsText}
              onChange={(e) => setNaicsText(e.target.value)}
              rows={20}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono text-sm focus:border-blue-500 focus:outline-none"
              placeholder="541330 - Engineering Services&#10;238210 - Electrical Contractors&#10;561621 - Security Systems Services"
            />
            <p className="text-xs text-gray-500 mt-2">
              {naicsText.split('\n').filter(Boolean).length} codes
            </p>
          </div>
        )}

        {/* PSC Codes Tab */}
        {activeTab === 'psc' && showPscCodes && (
          <div className="max-w-3xl">
            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-2">
                Enter PSC (Product Service Codes), one per line. Format: <code className="bg-gray-800 px-1 rounded">CODE - Description</code>
              </p>
              <p className="text-xs text-gray-500">
                Example: R425 - Engineering and Technical Services
              </p>
            </div>
            <textarea
              value={pscText}
              onChange={(e) => setPscText(e.target.value)}
              rows={20}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono text-sm focus:border-blue-500 focus:outline-none"
              placeholder="R425 - Engineering and Technical Services&#10;J099 - Maintenance of Misc Equipment&#10;S206 - Housekeeping Services"
            />
            <p className="text-xs text-gray-500 mt-2">
              {pscText.split('\n').filter(Boolean).length} codes
            </p>
          </div>
        )}

        {/* UNSPSC Codes Tab */}
        {activeTab === 'unspsc' && (
          <div className="max-w-3xl">
            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-2">
                Enter UNSPSC codes, one per line. Format: <code className="bg-gray-800 px-1 rounded">CODE - Description</code>
              </p>
              <p className="text-xs text-gray-500">
                Example: 72101500 - Building construction services
              </p>
            </div>
            <textarea
              value={unspscText}
              onChange={(e) => setUnspscText(e.target.value)}
              rows={20}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono text-sm focus:border-blue-500 focus:outline-none"
              placeholder="72101500 - Building construction services&#10;81101500 - Engineering services&#10;92121500 - Security guard services"
            />
            <p className="text-xs text-gray-500 mt-2">
              {unspscText.split('\n').filter(Boolean).length} codes
            </p>
          </div>
        )}

        {/* Keywords Tab */}
        {activeTab === 'keywords' && (
          <div className="max-w-3xl">
            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-2">
                Enter keywords, one per line. These will be used to search for relevant opportunities.
              </p>
            </div>
            <textarea
              value={keywordsText}
              onChange={(e) => setKeywordsText(e.target.value)}
              rows={20}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono text-sm focus:border-blue-500 focus:outline-none"
              placeholder="fire alarm&#10;security system&#10;CCTV&#10;access control&#10;intrusion detection"
            />
            <p className="text-xs text-gray-500 mt-2">
              {keywordsText.split('\n').filter(Boolean).length} keywords
            </p>
          </div>
        )}

        {/* Categories Tab (for PlanetBids etc) */}
        {activeTab === 'categories' && showCategories && (
          <div className="max-w-4xl">
            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-2">
                Select categories to monitor for this portal. Use search to filter through {availableCategories.length} available categories.
              </p>
              <div className="flex items-center gap-4">
                <input
                  type="text"
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  placeholder="Search categories..."
                  className="flex-1 max-w-md bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                />
                <span className="text-sm text-gray-400">
                  {selectedCategories.size} selected
                </span>
              </div>
            </div>

            {/* Selected categories */}
            {selectedCategories.size > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-400 mb-2">Selected Categories</h4>
                <div className="flex flex-wrap gap-2">
                  {Array.from(selectedCategories).map(catId => {
                    const cat = availableCategories.find(c => c.id === catId);
                    return (
                      <button
                        key={catId}
                        onClick={() => toggleCategory(catId)}
                        className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-colors"
                      >
                        {cat?.name || catId} ×
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Available categories */}
            <div className="border border-gray-700 rounded-lg overflow-hidden">
              <div className="max-h-96 overflow-y-auto">
                {filteredCategories.length > 0 ? (
                  <div className="divide-y divide-gray-700">
                    {filteredCategories.slice(0, 200).map(cat => (
                      <label
                        key={cat.id}
                        className="flex items-center gap-3 px-4 py-2 hover:bg-gray-800/50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCategories.has(cat.id)}
                          onChange={() => toggleCategory(cat.id)}
                          className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white truncate">{cat.name}</div>
                          {cat.parent && (
                            <div className="text-xs text-gray-500 truncate">{cat.parent}</div>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 font-mono">{cat.id}</span>
                      </label>
                    ))}
                    {filteredCategories.length > 200 && (
                      <div className="px-4 py-2 text-sm text-gray-500 text-center">
                        Showing 200 of {filteredCategories.length} results. Use search to narrow down.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="px-4 py-8 text-center text-gray-500">
                    {categorySearch ? 'No categories match your search' : 'No categories available'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-gray-700 bg-gray-900/50 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {source?.lastChecked && `Last checked: ${new Date(source.lastChecked).toLocaleString()}`}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={backPath}
            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 text-sm font-semibold bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save & Push'}
          </button>
        </div>
      </div>
    </div>
  );
}
