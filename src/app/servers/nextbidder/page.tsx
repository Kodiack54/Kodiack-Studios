import { getHealth, getStatus, getSources } from './api';
import ServerStatus from './components/ServerStatus';
import SourcesTable from './components/SourcesTable';
import Link from 'next/link';

export default async function NextBidderPage() {
  let health: any = null;
  let status: any = null;
  let sources: any[] = [];
  let error: string | null = null;

  try {
    const [healthRes, statusRes, sourcesRes] = await Promise.all([
      getHealth().catch(() => null),
      getStatus().catch(() => null),
      getSources().catch(() => ({ sources: [] }))
    ]);

    health = healthRes;
    status = statusRes;
    sources = (sourcesRes as any).sources || [];
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-700">
        <div>
          <h2 className="text-2xl font-semibold text-white">NextBidder</h2>
          <p className="text-gray-400 text-sm">7103 - Auction House Suppliers Opportunity Finder</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/servers/nextbidder/credentials"
            className="px-4 py-2 bg-purple-500/15 text-purple-400 border border-purple-500/30 rounded-lg text-sm font-semibold hover:bg-purple-500 hover:text-white transition-colors"
          >
            Credentials
          </Link>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-500/15 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Server Status */}
      <ServerStatus health={health} status={status} />

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <div className="text-3xl font-semibold text-white mb-1">{sources.length}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">Auction Sources</div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <div className="text-3xl font-semibold text-green-400 mb-1">
            {sources.filter((s: any) => s.status === 'active').length}
          </div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">Active</div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <div className="text-3xl font-semibold text-blue-400 mb-1">
            {status?.opportunities_found || '-'}
          </div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">Opportunities Found</div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <div className="text-3xl font-semibold text-yellow-400 mb-1">
            {status?.last_run || '-'}
          </div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">Last Discovery</div>
        </div>
      </div>

      {/* Sources Table */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Auction Sources</h3>
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors">
            + Add Source
          </button>
        </div>
        <SourcesTable sources={sources} />
      </div>
    </div>
  );
}
