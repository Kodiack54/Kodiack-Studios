'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface GitSummary {
  total: number;
  synced: number;
  drifted: number;
  dirty: number;
  droplets: string[];
}

interface GitStatusSummaryProps {
  summary?: GitSummary | null;
  loading?: boolean;
  compact?: boolean; // For Ops page - smaller version
}

export default function GitStatusSummary({ summary: propSummary, loading: propLoading, compact = false }: GitStatusSummaryProps) {
  const [summary, setSummary] = useState<GitSummary | null>(propSummary || null);
  const [loading, setLoading] = useState(propLoading ?? true);

  // Only fetch if not provided via props
  useEffect(() => {
    if (propSummary !== undefined) {
      setSummary(propSummary);
      setLoading(false);
      return;
    }

    const fetchSummary = async () => {
      try {
        const res = await fetch('/git-database/api/drift');
        const data = await res.json();
        
        if (data.success) {
          const droplets = new Set<string>();
          let total = 0, synced = 0, drifted = 0, dirty = 0;
          
          for (const node of data.nodes || []) {
            droplets.add(node.node_id);
            for (const repo of node.repos || []) {
              total++;
              if (repo.drift_status === 'green') synced++;
              else if (repo.drift_status === 'orange' || repo.drift_status === 'red') drifted++;
              if (repo.is_dirty) dirty++;
            }
          }
          
          if (data.pc?.repos) {
            for (const repo of data.pc.repos) {
              total++;
              if (!repo.dirty && repo.ahead === 0 && repo.behind === 0) synced++;
              else drifted++;
              if (repo.dirty) dirty++;
            }
          }
          
          setSummary({ total, synced, drifted, dirty, droplets: Array.from(droplets).sort() });
        }
      } catch (e) {
        console.error('Failed to fetch git summary:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
    const interval = setInterval(fetchSummary, 30000);
    return () => clearInterval(interval);
  }, [propSummary]);

  if (loading) {
    return (
      <div className={`bg-gray-800 border border-gray-700 rounded-xl ${compact ? 'p-3' : 'p-4'} h-full`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-24 mb-4" />
          <div className="grid grid-cols-2 gap-2">
            <div className="h-12 bg-gray-700 rounded" />
            <div className="h-12 bg-gray-700 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-xl ${compact ? 'p-3' : 'p-4'} h-full flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs uppercase text-gray-500 font-medium tracking-wide">GIT STATUS</h3>
        <Link 
          href="/git-database" 
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          View All →
        </Link>
      </div>

      {/* Stats Grid */}
      <div className={`grid grid-cols-2 ${compact ? 'gap-2' : 'gap-3'} flex-1`}>
        <div className="bg-gray-900/50 rounded-lg p-2">
          <div className={`font-bold text-green-400 ${compact ? 'text-xl' : 'text-2xl'}`}>{summary?.synced || 0}</div>
          <div className="text-xs text-gray-500">Synced</div>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-2">
          <div className={`font-bold text-orange-400 ${compact ? 'text-xl' : 'text-2xl'}`}>{summary?.drifted || 0}</div>
          <div className="text-xs text-gray-500">Drifted</div>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-2">
          <div className={`font-bold text-yellow-400 ${compact ? 'text-xl' : 'text-2xl'}`}>{summary?.dirty || 0}</div>
          <div className="text-xs text-gray-500">Dirty</div>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-2">
          <div className={`font-bold text-blue-400 ${compact ? 'text-xl' : 'text-2xl'}`}>{summary?.total || 0}</div>
          <div className="text-xs text-gray-500">Total</div>
        </div>
      </div>

      {/* Droplet Links - only show if not compact */}
      {!compact && summary?.droplets && summary.droplets.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="text-xs text-gray-500 mb-2">Droplets:</div>
          <div className="flex flex-wrap gap-1">
            {summary.droplets.map(d => (
              <Link
                key={d}
                href={`/git-database?droplet=${d}`}
                className="px-2 py-0.5 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
              >
                {d}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
