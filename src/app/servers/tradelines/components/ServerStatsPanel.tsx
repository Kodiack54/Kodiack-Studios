'use client';

import { useState, useEffect } from 'react';

interface ServerStatsPanelProps {
  tradeline: string;
}

interface TradelineStats {
  today: {
    opportunities: number;
    documents: number;
    aiCost: number;
    bySource: Record<string, number>;
    byStage: Record<string, number>;
  };
  totals: {
    opportunities: number;
    documents: number;
  };
  storage: {
    used: number;
    usedFormatted: string;
    limit: number;
    limitFormatted: string;
    percent: number;
  };
}

const SOURCE_LABELS: Record<string, string> = {
  'SAM.gov': 'Federal',
  'Cal-e-Procure': 'State',
  'PlanetBids': 'Local',
  'PublicPurchase': 'Municipal',
  'BidNet': 'Regional',
};

const STAGE_LABELS: Record<string, string> = {
  discovery: 'Stage 1',
  scraping: 'Stage 2',
  analysis: 'Stage 3',
  storage: 'Stage 4',
};

export default function ServerStatsPanel({ tradeline }: ServerStatsPanelProps) {
  const [stats, setStats] = useState<TradelineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const res = await fetch(`/api/tradelines/stats/${tradeline}`);
      const data = await res.json();

      if (data.success) {
        setStats(data);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch stats');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(true);
  }, [tradeline]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchStats(), 30000);
    return () => clearInterval(interval);
  }, [tradeline]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 text-sm">
        Loading stats...
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-4">
        <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Today&apos;s Stats</div>
        <div className="text-gray-600 text-sm">No data available</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="bg-black/30 px-4 py-2 border-b border-gray-700 sticky top-0">
        <h3 className="text-xs uppercase text-gray-500 font-medium tracking-wide">Today&apos;s Stats</h3>
      </div>

      <div className="p-3 space-y-4">
        {/* Quick Numbers */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-700/30 rounded p-2">
            <div className="text-lg font-bold text-cyan-400">{stats.today.opportunities}</div>
            <div className="text-[10px] text-gray-500 uppercase">Ops Today</div>
          </div>
          <div className="bg-gray-700/30 rounded p-2">
            <div className="text-lg font-bold text-blue-400">{stats.today.documents}</div>
            <div className="text-[10px] text-gray-500 uppercase">Docs Today</div>
          </div>
        </div>

        {/* AI Cost */}
        <div className="bg-gray-700/30 rounded p-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-gray-500 uppercase">AI Cost Today</span>
            <span className="text-sm font-mono text-green-400">
              ${stats.today.aiCost.toFixed(2)}
            </span>
          </div>
        </div>

        {/* By Source */}
        <div>
          <div className="text-[10px] text-gray-500 uppercase mb-1.5">By Source</div>
          <div className="space-y-1">
            {Object.entries(stats.today.bySource).map(([source, count]) => (
              <div key={source} className="flex items-center justify-between text-xs">
                <span className="text-gray-400">{SOURCE_LABELS[source] || source}</span>
                <span className="text-white font-mono">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* By Stage */}
        <div>
          <div className="text-[10px] text-gray-500 uppercase mb-1.5">By Stage</div>
          <div className="grid grid-cols-4 gap-1">
            {Object.entries(stats.today.byStage).map(([stage, count]) => (
              <div key={stage} className="bg-gray-700/50 rounded p-1.5 text-center">
                <div className="text-sm font-bold text-white">{count}</div>
                <div className="text-[9px] text-gray-500">{STAGE_LABELS[stage] || stage}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Storage */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-gray-500 uppercase">Storage</span>
            <span className="text-[10px] text-gray-400">
              {stats.storage.usedFormatted} / {stats.storage.limitFormatted}
            </span>
          </div>
          <div className="h-2 bg-gray-700 rounded overflow-hidden">
            <div
              className={`h-full transition-all ${
                stats.storage.percent > 90 ? 'bg-red-500' :
                stats.storage.percent > 75 ? 'bg-yellow-500' : 'bg-cyan-500'
              }`}
              style={{ width: `${Math.min(stats.storage.percent, 100)}%` }}
            />
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5 text-right">
            {stats.storage.percent}% used
          </div>
        </div>

        {/* Totals */}
        <div className="border-t border-gray-700 pt-3">
          <div className="text-[10px] text-gray-500 uppercase mb-1.5">All Time</div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Total Ops</span>
            <span className="text-white font-mono">{stats.totals.opportunities.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className="text-gray-400">Total Docs</span>
            <span className="text-white font-mono">{stats.totals.documents.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
