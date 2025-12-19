'use client';

import { useState } from 'react';

interface Source {
  id: string;
  name: string;
  url: string;
  type: 'service' | 'suppliers';
  status: string;
  verified: boolean;
  last_checked?: string;
}

interface SourcesListProps {
  sources: Source[];
}

export default function SourcesList({ sources }: SourcesListProps) {
  const [filter, setFilter] = useState<'all' | 'service' | 'suppliers'>('all');
  const [search, setSearch] = useState('');

  const filteredSources = sources.filter((s) => {
    if (filter !== 'all' && s.type !== filter) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) &&
        !s.url.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Discovered Sources</h3>
        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors">
          + Add Source
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('service')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'service'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
            }`}
          >
            Service
          </button>
          <button
            onClick={() => setFilter('suppliers')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'suppliers'
                ? 'bg-green-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
            }`}
          >
            Suppliers
          </button>
        </div>
        <input
          type="text"
          placeholder="Search sources..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Sources List */}
      <div className="space-y-3">
        {filteredSources.map((source) => (
          <div
            key={source.id}
            className="bg-gray-800 border border-gray-700 rounded-xl p-4 hover:bg-blue-500/5 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-white">{source.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    source.type === 'service'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-green-500/20 text-green-400'
                  }`}>
                    {source.type}
                  </span>
                  {source.verified && (
                    <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">
                      Verified
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 truncate">{source.url}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Last checked: {source.last_checked || 'Never'}
                </div>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 text-xs font-semibold rounded bg-purple-500/15 text-purple-400 border border-purple-500/30 hover:bg-purple-500 hover:text-white transition-colors">
                  Verify
                </button>
                <button className="px-3 py-1 text-xs font-semibold rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500 hover:text-white transition-colors">
                  Edit
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredSources.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No sources found
          </div>
        )}
      </div>
    </div>
  );
}
