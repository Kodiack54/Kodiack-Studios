'use client';

import { useState, useEffect, useContext, useCallback } from 'react';
import {
  Server, Database, Users, Wrench, ListTodo,
  RefreshCw, HardDrive, DollarSign, Search, Gavel, Loader2
} from 'lucide-react';
import { PageTitleContext, PageActionsContext } from '@/app/layout';
import { useUser, ProductId, ALL_PRODUCTS } from '@/app/settings/UserContext';
import { getEngineAnalytics, EngineAnalyticsData } from '@/app/dev-controls/api';

// Auto-refresh interval (5 minutes)
const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000;

// Same product definitions as Push/Pull page for consistency
interface Product {
  id: ProductId;
  name: string;
  icon: React.ReactNode;
  color: string;
}

const PRODUCTS: Product[] = [
  { id: 'tradelines', name: 'NextBid Engine', icon: <Server className="w-4 h-4" />, color: 'cyan' },
  { id: 'sources', name: 'NextSource', icon: <Database className="w-4 h-4" />, color: 'orange' },
  { id: 'nextbidder', name: 'NextBidder', icon: <Gavel className="w-4 h-4" />, color: 'purple' },
  { id: 'portals', name: 'NextBid Portal', icon: <Users className="w-4 h-4" />, color: 'green' },
  { id: 'nexttech', name: 'NextTech', icon: <Wrench className="w-4 h-4" />, color: 'pink' },
  { id: 'nexttask', name: 'NextTask', icon: <ListTodo className="w-4 h-4" />, color: 'yellow' },
];

const colorClasses: Record<string, { bg: string; border: string; text: string }> = {
  cyan: { bg: 'bg-cyan-500/15', border: 'border-cyan-500/30', text: 'text-cyan-400' },
  orange: { bg: 'bg-orange-500/15', border: 'border-orange-500/30', text: 'text-orange-400' },
  purple: { bg: 'bg-purple-500/15', border: 'border-purple-500/30', text: 'text-purple-400' },
  green: { bg: 'bg-green-500/15', border: 'border-green-500/30', text: 'text-green-400' },
  pink: { bg: 'bg-pink-500/15', border: 'border-pink-500/30', text: 'text-pink-400' },
  yellow: { bg: 'bg-yellow-500/15', border: 'border-yellow-500/30', text: 'text-yellow-400' },
};

export default function AnalyticsPage() {
  const { hasProjectAccess } = useUser();
  const [selectedProduct, setSelectedProduct] = useState<ProductId>('tradelines');
  const [refreshCountdown, setRefreshCountdown] = useState(AUTO_REFRESH_INTERVAL);
  const [currentTime, setCurrentTime] = useState(new Date());
  const setPageTitle = useContext(PageTitleContext);
  const setPageActions = useContext(PageActionsContext);

  const allowedProducts = PRODUCTS.filter(p => hasProjectAccess(p.id));
  const currentProduct = PRODUCTS.find(p => p.id === selectedProduct) || PRODUCTS[0];

  // Format countdown as MM:SS
  const formatCountdown = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  useEffect(() => {
    setPageTitle({
      title: 'Analytics',
      description: `${currentProduct.name} metrics and reporting`,
    });

    // Refresh button in blue header bar
    setPageActions(
      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 border border-black/30 rounded-lg text-white text-sm transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Refresh
      </button>
    );

    return () => setPageActions(null);
  }, [setPageTitle, setPageActions, currentProduct]);

  // Countdown timer and clock for page-level display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      setRefreshCountdown(prev => {
        if (prev <= 1000) return AUTO_REFRESH_INTERVAL;
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="-mt-4">
      {/* Product Selector - Sticky (same as Push/Pull) */}
      <div className="sticky -top-4 z-20 bg-gray-900 -mx-8 px-8 pt-4 pb-3 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">Product:</span>
            <div className="flex gap-2 flex-wrap">
              {PRODUCTS.map((product) => {
                const colors = colorClasses[product.color];
                const isSelected = selectedProduct === product.id;
                return (
                  <button
                    key={product.id}
                    onClick={() => setSelectedProduct(product.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                      isSelected
                        ? `${colors.bg} ${colors.border} ${colors.text}`
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                    }`}
                  >
                    {product.icon}
                    {product.name}
                  </button>
                );
              })}
            </div>
          </div>
          {/* Updated time and countdown */}
          <div className="flex items-center gap-6 text-gray-300 text-2xl">
            <span>Updated: {currentTime.toLocaleTimeString()}</span>
            <span className="font-bold">Next refresh: {formatCountdown(refreshCountdown)}</span>
          </div>
        </div>
      </div>

      {/* Content based on selected product */}
      <div className="pt-6">
        {selectedProduct === 'tradelines' && <EngineAnalytics />}
        {selectedProduct === 'sources' && <NextSourceAnalytics />}
        {selectedProduct === 'nextbidder' && <NextBidderAnalytics />}
        {selectedProduct === 'portals' && <PortalAnalytics />}
        {selectedProduct === 'nexttech' && <NextTechAnalytics />}
        {selectedProduct === 'nexttask' && <NextTaskAnalytics />}
      </div>
    </div>
  );
}

// ============ NEXTBID ENGINE ============
function EngineAnalytics() {
  const [data, setData] = useState<EngineAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextRefresh, setNextRefresh] = useState<number>(AUTO_REFRESH_INTERVAL);

  const fetchData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError(null);
    try {
      const result = await getEngineAnalytics();
      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to load analytics');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      setNextRefresh(AUTO_REFRESH_INTERVAL);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      fetchData(false); // Don't show loading spinner on auto-refresh
    }, AUTO_REFRESH_INTERVAL);

    // Countdown timer (updates every second)
    const countdownInterval = setInterval(() => {
      setNextRefresh(prev => Math.max(0, prev - 1000));
    }, 1000);

    return () => {
      clearInterval(refreshInterval);
      clearInterval(countdownInterval);
    };
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        <span className="ml-3 text-gray-400">Loading analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={() => fetchData()}
          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400 text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Total Opportunities"
          value={data?.opportunities.allTime.toLocaleString() || '0'}
          subLabel="All time"
          color="text-cyan-400"
        />
        <StatCard
          label="Total Documents"
          value={data?.documents.allTime.toLocaleString() || '0'}
          subLabel="All time"
          color="text-blue-400"
        />
        <StatCard
          label="This Month"
          value={data?.opportunities.month.toLocaleString() || '0'}
          subLabel="Opportunities"
          color="text-green-400"
        />
        <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2">
          <div className="text-xs text-gray-500">Supabase Storage</div>
          <div className="text-2xl font-bold text-purple-400">
            {data?.storage.used.formatted || '0 B'}
            <span className="text-sm text-gray-500 font-normal ml-1">/ {data?.storage.limit.formatted || '100 GB'}</span>
          </div>
          <div className="mt-1 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full transition-all"
              style={{ width: `${Math.min(data?.storage.percentage || 0, 100)}%` }}
            />
          </div>
          <div className="text-xs text-gray-500">{data?.storage.percentage || 0}% used</div>
        </div>
      </div>

      {/* Time-based Stats - 3 Column Vertical Layout */}
      <div className="grid grid-cols-3 gap-4">
        {/* Opportunities Found */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-700">
            <h2 className="font-semibold text-white text-sm">Opportunities Found</h2>
          </div>
          <div className="divide-y divide-gray-700">
            <div className="px-4 py-2 flex justify-between">
              <span className="text-gray-500 text-sm">Week</span>
              <span className="text-white font-medium">{data?.opportunities.week.toLocaleString() || '0'}</span>
            </div>
            <div className="px-4 py-2 flex justify-between">
              <span className="text-gray-500 text-sm">Month</span>
              <span className="text-white font-medium">{data?.opportunities.month.toLocaleString() || '0'}</span>
            </div>
            <div className="px-4 py-2 flex justify-between">
              <span className="text-gray-500 text-sm">Year</span>
              <span className="text-white font-medium">{data?.opportunities.year.toLocaleString() || '0'}</span>
            </div>
            <div className="px-4 py-2 flex justify-between bg-gray-900">
              <span className="text-gray-500 text-sm">All Time</span>
              <span className="text-cyan-400 font-bold">{data?.opportunities.allTime.toLocaleString() || '0'}</span>
            </div>
          </div>
        </div>

        {/* Documents Processed */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-700">
            <h2 className="font-semibold text-white text-sm">Documents Processed</h2>
          </div>
          <div className="divide-y divide-gray-700">
            <div className="px-4 py-2 flex justify-between">
              <span className="text-gray-500 text-sm">Week</span>
              <span className="text-white font-medium">{data?.documents.week.toLocaleString() || '0'}</span>
            </div>
            <div className="px-4 py-2 flex justify-between">
              <span className="text-gray-500 text-sm">Month</span>
              <span className="text-white font-medium">{data?.documents.month.toLocaleString() || '0'}</span>
            </div>
            <div className="px-4 py-2 flex justify-between">
              <span className="text-gray-500 text-sm">Year</span>
              <span className="text-white font-medium">{data?.documents.year.toLocaleString() || '0'}</span>
            </div>
            <div className="px-4 py-2 flex justify-between bg-gray-900">
              <span className="text-gray-500 text-sm">All Time</span>
              <span className="text-cyan-400 font-bold">{data?.documents.allTime.toLocaleString() || '0'}</span>
            </div>
          </div>
        </div>

        {/* AI Costs */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-700">
            <h2 className="font-semibold text-white text-sm flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5 text-yellow-400" />
              AI Costs (SOW)
            </h2>
          </div>
          <div className="divide-y divide-gray-700">
            <div className="px-4 py-2 flex justify-between">
              <span className="text-gray-500 text-sm">Week</span>
              <span className="text-white font-medium">${(data?.aiCosts?.week || 0).toFixed(3)}</span>
            </div>
            <div className="px-4 py-2 flex justify-between">
              <span className="text-gray-500 text-sm">Month</span>
              <span className="text-white font-medium">${(data?.aiCosts?.month || 0).toFixed(3)}</span>
            </div>
            <div className="px-4 py-2 flex justify-between">
              <span className="text-gray-500 text-sm">Year</span>
              <span className="text-white font-medium">${(data?.aiCosts?.year || 0).toFixed(3)}</span>
            </div>
            <div className="px-4 py-2 flex justify-between bg-gray-900">
              <span className="text-gray-500 text-sm">All Time</span>
              <span className="text-yellow-400 font-bold">${(data?.aiCosts?.allTime || 0).toFixed(3)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Storage & Sources - Side by Side Scrollable */}
      <div className="grid grid-cols-2 gap-4">
        {/* Storage by Tradeline */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl flex flex-col">
          <div className="px-4 py-2 border-b border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-white text-sm flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-cyan-400" />
              Storage by Tradeline
            </h2>
            <span className="text-xs text-gray-400">
              {data?.storage.used.formatted || '0 B'} / {data?.storage.limit.formatted || '100 GB'}
            </span>
          </div>
          <div className="p-3 space-y-2 overflow-y-auto max-h-96 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
            {data?.tradelines.map((tradeline) => (
              <StorageRow
                key={tradeline.name}
                label={tradeline.name}
                size={tradeline.storage}
                storageBytes={tradeline.storageBytes}
                status={tradeline.status}
                docCount={tradeline.documents}
                opsCount={tradeline.opportunities}
              />
            ))}
            {(!data?.tradelines || data.tradelines.length === 0) && (
              <div className="text-center text-gray-500 text-sm py-4">
                No tradeline data available
              </div>
            )}
            {data?.tradelines && data.tradelines.length === 1 && (
              <div className="text-center text-gray-500 text-xs pt-2 border-t border-gray-700 mt-2">
                + 19 more tradelines (offline)
              </div>
            )}
          </div>
        </div>

        {/* Source Counts */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl flex flex-col">
          <div className="px-4 py-2 border-b border-gray-700">
            <h2 className="font-semibold text-white text-sm">By Source (All Tradelines)</h2>
          </div>
          <div className="overflow-y-auto max-h-96 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-900 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-1.5 text-gray-500 font-medium text-xs">Source</th>
                  <th className="text-right px-3 py-1.5 text-gray-500 font-medium text-xs">Week</th>
                  <th className="text-right px-3 py-1.5 text-gray-500 font-medium text-xs">Month</th>
                  <th className="text-right px-3 py-1.5 text-gray-500 font-medium text-xs">All Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                <tr className="hover:bg-gray-700/30">
                  <td className="px-3 py-1.5 text-white">SAM.gov</td>
                  <td className="px-3 py-1.5 text-right text-gray-400">{data?.bySource?.week?.['SAM.gov']?.toLocaleString() || '0'}</td>
                  <td className="px-3 py-1.5 text-right text-gray-400">{data?.bySource?.month?.['SAM.gov']?.toLocaleString() || '0'}</td>
                  <td className="px-3 py-1.5 text-right text-cyan-400 font-medium">{data?.bySource?.allTime?.['SAM.gov']?.toLocaleString() || '0'}</td>
                </tr>
                <tr className="hover:bg-gray-700/30">
                  <td className="px-3 py-1.5 text-white">Cal-e-Procure</td>
                  <td className="px-3 py-1.5 text-right text-gray-400">{data?.bySource?.week?.['Cal-e-Procure']?.toLocaleString() || '0'}</td>
                  <td className="px-3 py-1.5 text-right text-gray-400">{data?.bySource?.month?.['Cal-e-Procure']?.toLocaleString() || '0'}</td>
                  <td className="px-3 py-1.5 text-right text-cyan-400 font-medium">{data?.bySource?.allTime?.['Cal-e-Procure']?.toLocaleString() || '0'}</td>
                </tr>
                <tr className="hover:bg-gray-700/30">
                  <td className="px-3 py-1.5 text-white">PlanetBids</td>
                  <td className="px-3 py-1.5 text-right text-gray-400">{data?.bySource?.week?.['PlanetBids']?.toLocaleString() || '0'}</td>
                  <td className="px-3 py-1.5 text-right text-gray-400">{data?.bySource?.month?.['PlanetBids']?.toLocaleString() || '0'}</td>
                  <td className="px-3 py-1.5 text-right text-cyan-400 font-medium">{data?.bySource?.allTime?.['PlanetBids']?.toLocaleString() || '0'}</td>
                </tr>
                <tr className="hover:bg-gray-700/30">
                  <td className="px-3 py-1.5 text-white">PublicPurchase</td>
                  <td className="px-3 py-1.5 text-right text-gray-400">{data?.bySource?.week?.['PublicPurchase']?.toLocaleString() || '0'}</td>
                  <td className="px-3 py-1.5 text-right text-gray-400">{data?.bySource?.month?.['PublicPurchase']?.toLocaleString() || '0'}</td>
                  <td className="px-3 py-1.5 text-right text-cyan-400 font-medium">{data?.bySource?.allTime?.['PublicPurchase']?.toLocaleString() || '0'}</td>
                </tr>
                <tr className="hover:bg-gray-700/30">
                  <td className="px-3 py-1.5 text-white">BidNet</td>
                  <td className="px-3 py-1.5 text-right text-gray-400">{data?.bySource?.week?.['BidNet']?.toLocaleString() || '0'}</td>
                  <td className="px-3 py-1.5 text-right text-gray-400">{data?.bySource?.month?.['BidNet']?.toLocaleString() || '0'}</td>
                  <td className="px-3 py-1.5 text-right text-cyan-400 font-medium">{data?.bySource?.allTime?.['BidNet']?.toLocaleString() || '0'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Last Updated + Auto Refresh */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div>
          {data?.tradelineCount && (
            <span>
              {data.tradelineCount.active} of {data.tradelineCount.total} tradelines reporting
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {data?.lastUpdated && (
            <span>Updated: {new Date(data.lastUpdated).toLocaleTimeString()}</span>
          )}
          <span className="text-cyan-400">
            Next refresh: {Math.floor(nextRefresh / 60000)}:{String(Math.floor((nextRefresh % 60000) / 1000)).padStart(2, '0')}
          </span>
        </div>
      </div>
    </div>
  );
}

// Stat card component
function StatCard({ label, value, subLabel, color }: {
  label: string;
  value: string;
  subLabel: string;
  color: string;
}) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500">{subLabel}</div>
    </div>
  );
}

// ============ NEXTSOURCE ============
function NextSourceAnalytics() {
  return (
    <div className="space-y-6">
      <HeaderCard
        icon={<Database className="w-8 h-8 text-orange-400" />}
        title="NextSource Analytics"
        description="Government bid source discovery and monitoring"
        stats={[
          { label: 'Total Sources', value: '400+', color: 'text-orange-400' },
          { label: 'Active', value: '~', color: 'text-green-400' },
          { label: 'Rate Limited', value: '~', color: 'text-yellow-400' },
          { label: 'Erroring', value: '~', color: 'text-red-400' },
        ]}
      />

      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700">
          <h2 className="font-semibold text-white">Sources Discovered by Region</h2>
        </div>
        <TimeTable rows={[
          { label: 'California', week: '~', month: '~', year: '~', allTime: '350+' },
          { label: 'Texas', week: '~', month: '~', year: '~', allTime: '~' },
          { label: 'Florida', week: '~', month: '~', year: '~', allTime: '~' },
          { label: 'Federal', week: '~', month: '~', year: '~', allTime: '~' },
        ]} />
      </div>

      <Placeholder text="Connect to NextSource API for live data" />
    </div>
  );
}

// ============ NEXTBIDDER ============
function NextBidderAnalytics() {
  return (
    <div className="space-y-6">
      <HeaderCard
        icon={<Gavel className="w-8 h-8 text-purple-400" />}
        title="NextBidder Analytics"
        description="Auction items, bidders, and price guide data"
        stats={[
          { label: 'Items Collected', value: '~', color: 'text-purple-400' },
          { label: 'Active Bidders', value: '~', color: 'text-green-400' },
          { label: 'Price Points', value: '~', color: 'text-blue-400' },
          { label: 'Alerts Sent', value: '~', color: 'text-yellow-400' },
        ]}
      />

      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700">
          <h2 className="font-semibold text-white">Auction Activity</h2>
        </div>
        <TimeTable rows={[
          { label: 'Items Listed', week: '~', month: '~', year: '~', allTime: '~' },
          { label: 'Bids Placed', week: '~', month: '~', year: '~', allTime: '~' },
          { label: 'Items Won', week: '~', month: '~', year: '~', allTime: '~' },
          { label: 'Price Guide Entries', week: '~', month: '~', year: '~', allTime: '~' },
        ]} />
      </div>

      <Placeholder text="Connect to NextBidder API for live data" />
    </div>
  );
}

// ============ PORTAL ============
function PortalAnalytics() {
  return (
    <div className="space-y-6">
      <HeaderCard
        icon={<Users className="w-8 h-8 text-green-400" />}
        title="NextBid Portal Analytics"
        description="Users, companies, searches, and work orders"
        stats={[
          { label: 'Active Users', value: '~', color: 'text-green-400' },
          { label: 'Companies', value: '~', color: 'text-blue-400' },
          { label: 'Searches Today', value: '~', color: 'text-purple-400' },
          { label: 'Work Orders', value: '~', color: 'text-yellow-400' },
        ]}
      />

      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700">
          <h2 className="font-semibold text-white">Work Orders by Company</h2>
        </div>
        <TimeTable rows={[
          { label: 'Company A', week: '~', month: '~', year: '~', allTime: '~' },
          { label: 'Company B', week: '~', month: '~', year: '~', allTime: '~' },
          { label: 'Company C', week: '~', month: '~', year: '~', allTime: '~' },
        ]} />
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-400" />
            Top Keyword Searches
          </h2>
        </div>
        <div className="p-4 text-center text-gray-500">
          Keyword search results and hit rates
        </div>
      </div>

      <Placeholder text="Connect to Portal API for live data" />
    </div>
  );
}

// ============ NEXTTECH ============
function NextTechAnalytics() {
  return (
    <div className="space-y-6">
      <HeaderCard
        icon={<Wrench className="w-8 h-8 text-pink-400" />}
        title="NextTech Analytics"
        description="Training, SOPs, job feedback, and AI learning"
        stats={[
          { label: 'SOPs Created', value: '~', color: 'text-pink-400' },
          { label: 'Training Sessions', value: '~', color: 'text-blue-400' },
          { label: 'Jobs Completed', value: '~', color: 'text-green-400' },
          { label: 'AI Learnings', value: '~', color: 'text-yellow-400' },
        ]}
      />

      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700">
          <h2 className="font-semibold text-white">Job Feedback & AI Learning</h2>
        </div>
        <TimeTable rows={[
          { label: 'Material Insights', week: '~', month: '~', year: '~', allTime: '~' },
          { label: 'Method Learnings', week: '~', month: '~', year: '~', allTime: '~' },
          { label: 'Time Estimates', week: '~', month: '~', year: '~', allTime: '~' },
          { label: 'Cost Insights', week: '~', month: '~', year: '~', allTime: '~' },
        ]} />
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <h3 className="text-white font-medium mb-3">Recent AI Learnings</h3>
        <div className="space-y-2 text-sm">
          <div className="p-3 bg-gray-700/30 rounded-lg">
            <span className="text-pink-400">Junction boxes:</span>
            <span className="text-gray-400 ml-2">Required for stucco/cinder block walls (camera installs)</span>
          </div>
          <div className="p-3 bg-gray-700/30 rounded-lg">
            <span className="text-pink-400">Conduit:</span>
            <span className="text-gray-400 ml-2">Outdoor runs need weatherproof fittings</span>
          </div>
        </div>
      </div>

      <Placeholder text="Connect to NextTech API for live data" />
    </div>
  );
}

// ============ NEXTTASK ============
function NextTaskAnalytics() {
  return (
    <div className="space-y-6">
      <HeaderCard
        icon={<ListTodo className="w-8 h-8 text-yellow-400" />}
        title="NextTask Analytics"
        description="Gamified quests feeding the AI database"
        stats={[
          { label: 'Active Questers', value: '~', color: 'text-yellow-400' },
          { label: 'Quests Completed', value: '~', color: 'text-green-400' },
          { label: 'Data Points', value: '~', color: 'text-blue-400' },
          { label: 'XP Earned', value: '~', color: 'text-purple-400' },
        ]}
      />

      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700">
          <h2 className="font-semibold text-white">DB Contributions</h2>
        </div>
        <TimeTable rows={[
          { label: 'Labor Rates', week: '~', month: '~', year: '~', allTime: '~' },
          { label: 'Material Prices', week: '~', month: '~', year: '~', allTime: '~' },
          { label: 'Proposal Templates', week: '~', month: '~', year: '~', allTime: '~' },
          { label: 'Scope Clarifications', week: '~', month: '~', year: '~', allTime: '~' },
        ]} />
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <h3 className="text-white font-medium mb-3">Leaderboard</h3>
        <div className="space-y-2">
          <LeaderboardRow rank={1} name="~" points="~" />
          <LeaderboardRow rank={2} name="~" points="~" />
          <LeaderboardRow rank={3} name="~" points="~" />
        </div>
      </div>

      <Placeholder text="Connect to NextTask API for live data" />
    </div>
  );
}

// ============ SHARED COMPONENTS ============
interface TimeRowData {
  label: string;
  week: string;
  month: string;
  year: string;
  allTime: string;
}

function TimeTable({ rows }: { rows: TimeRowData[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-900">
          <tr>
            <th className="text-left px-4 py-2 text-gray-500 font-medium">Metric</th>
            <th className="text-right px-4 py-2 text-gray-500 font-medium">Week</th>
            <th className="text-right px-4 py-2 text-gray-500 font-medium">Month</th>
            <th className="text-right px-4 py-2 text-gray-500 font-medium">Year</th>
            <th className="text-right px-4 py-2 text-gray-500 font-medium">All Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-gray-700/30">
              <td className="px-4 py-2 text-white">{row.label}</td>
              <td className="px-4 py-2 text-right text-gray-400">{row.week}</td>
              <td className="px-4 py-2 text-right text-gray-400">{row.month}</td>
              <td className="px-4 py-2 text-right text-gray-400">{row.year}</td>
              <td className="px-4 py-2 text-right text-cyan-400 font-medium">{row.allTime}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 5 GB limit per tradeline
const TRADELINE_STORAGE_LIMIT = 5 * 1024 * 1024 * 1024; // 5 GB in bytes

function StorageRow({ label, size, storageBytes, status, docCount, opsCount }: {
  label: string;
  size: string;
  storageBytes: number;
  status?: 'online' | 'offline';
  docCount?: number;
  opsCount?: number;
}) {
  // Calculate percentage based on 5 GB limit per tradeline
  const percentage = (storageBytes / TRADELINE_STORAGE_LIMIT) * 100;

  // Color based on usage - cyan < 80%, yellow 80-95%, red > 95%
  const barColor = percentage > 95 ? 'bg-red-500' : percentage >= 80 ? 'bg-yellow-500' : 'bg-cyan-500';

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <div className="flex items-center gap-2">
          {status && (
            <span className={`w-2 h-2 rounded-full ${status === 'online' ? 'bg-green-500' : 'bg-gray-500'}`} />
          )}
          <span className="text-gray-400 font-mono text-xs">{label}</span>
          {docCount !== undefined && (
            <span className="text-gray-500 text-xs">({docCount.toLocaleString()} docs)</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {opsCount !== undefined && (
            <span className="text-cyan-400 text-xs">{opsCount.toLocaleString()} ops</span>
          )}
          <span className="text-white">{size}</span>
          <span className="text-gray-500 text-xs">/ 5 GB</span>
        </div>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${Math.min(percentage, 100)}%` }} />
      </div>
    </div>
  );
}

function HeaderCard({ icon, title, description, stats }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  stats: { label: string; value: string; color: string }[];
}) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        {icon}
        <div>
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <p className="text-gray-500">{description}</p>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-gray-700/30 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">{stat.label}</div>
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeaderboardRow({ rank, name, points }: { rank: number; name: string; points: string }) {
  const rankColors = ['text-yellow-400', 'text-gray-400', 'text-orange-400'];
  return (
    <div className="flex items-center justify-between p-2 bg-gray-700/30 rounded-lg">
      <div className="flex items-center gap-3">
        <span className={`font-bold ${rankColors[rank - 1] || 'text-gray-500'}`}>#{rank}</span>
        <span className="text-white">{name}</span>
      </div>
      <span className="text-yellow-400">{points} XP</span>
    </div>
  );
}

function Placeholder({ text }: { text: string }) {
  return (
    <div className="text-center text-gray-500 py-8 border border-dashed border-gray-700 rounded-xl">
      {text}
    </div>
  );
}
