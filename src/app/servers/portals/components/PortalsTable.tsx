'use client';

import Link from 'next/link';
import { useState } from 'react';
import PortalActions from './PortalActions';

interface Portal {
  id: string;
  name: string;
  company_id: string;
  company_name?: string;
  platform: string;
  status: string;
  tradelines?: string[];
  users_count?: number;
  created_at?: string;
}

interface PortalsTableProps {
  portals: Portal[];
  health: Record<string, any>;
}

export default function PortalsTable({ portals, health }: PortalsTableProps) {
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [search, setSearch] = useState('');

  const filteredPortals = portals.filter((p) => {
    if (filter !== 'all' && p.status !== filter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !p.company_name?.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
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
            onClick={() => setFilter('active')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'active'
                ? 'bg-green-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('inactive')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'inactive'
                ? 'bg-gray-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
            }`}
          >
            Inactive
          </button>
        </div>
        <input
          type="text"
          placeholder="Search portals..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 max-w-xs bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-black/30 border-b border-gray-700">
              <th className="px-4 py-3 text-left text-xs uppercase text-gray-500 font-medium">Portal</th>
              <th className="px-4 py-3 text-left text-xs uppercase text-gray-500 font-medium">Company</th>
              <th className="px-4 py-3 text-left text-xs uppercase text-gray-500 font-medium">Platform</th>
              <th className="px-4 py-3 text-left text-xs uppercase text-gray-500 font-medium">Tradelines</th>
              <th className="px-4 py-3 text-left text-xs uppercase text-gray-500 font-medium">Users</th>
              <th className="px-4 py-3 text-left text-xs uppercase text-gray-500 font-medium">Status</th>
              <th className="px-4 py-3 text-right text-xs uppercase text-gray-500 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPortals.map((portal) => {
              const portalHealth = health[portal.id] || {};

              return (
                <tr key={portal.id} className="border-b border-gray-700 hover:bg-blue-500/5">
                  <td className="px-4 py-3">
                    <Link
                      href={`/servers/portals/${portal.id}`}
                      className="font-medium text-white hover:text-blue-400 transition-colors"
                    >
                      {portal.name}
                    </Link>
                    <div className="text-xs text-gray-500">{portal.id}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {portal.company_name || portal.company_id}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                      {portal.platform}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {portal.tradelines?.slice(0, 3).map((t) => (
                        <span key={t} className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                          {t}
                        </span>
                      ))}
                      {(portal.tradelines?.length || 0) > 3 && (
                        <span className="text-xs text-gray-500">
                          +{(portal.tradelines?.length || 0) - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {portal.users_count || 0}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${
                      portal.status === 'active'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-gray-700 text-gray-400'
                    }`}>
                      {portal.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <PortalActions portal={portal} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredPortals.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No portals found
          </div>
        )}
      </div>
    </div>
  );
}
