import { getPortals, getHealth } from './api';
import PortalsTable from './components/PortalsTable';
import Link from 'next/link';

export default async function PortalsPage() {
  let portals: any[] = [];
  let health: any = {};
  let error: string | null = null;

  try {
    const [portalsRes, healthRes] = await Promise.all([
      getPortals().catch(() => ({ portals: [] })),
      getHealth().catch(() => ({}))
    ]);

    portals = (portalsRes as any).portals || [];
    health = healthRes;
  } catch (e) {
    error = (e as Error).message;
  }

  // Calculate stats
  const activeCount = portals.filter((p: any) => p.status === 'active').length;
  const inactiveCount = portals.filter((p: any) => p.status === 'inactive').length;
  const companiesCount = new Set(portals.map((p: any) => p.company_id)).size;

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-700">
        <div>
          <h2 className="text-2xl font-semibold text-white">User Portals</h2>
          <p className="text-gray-400 text-sm">7102 - NextBid Portal Patcher - Manage customer portals</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/servers/portals/credentials"
            className="px-4 py-2 bg-purple-500/15 text-purple-400 border border-purple-500/30 rounded-lg text-sm font-semibold hover:bg-purple-500 hover:text-white transition-colors"
          >
            All Credentials
          </Link>
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors">
            + New Portal
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-500/15 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl bg-blue-500/20 text-blue-400">
            #
          </div>
          <div>
            <h3 className="text-3xl font-semibold text-white">{portals.length}</h3>
            <span className="text-xs text-gray-400 uppercase tracking-wide">Total Portals</span>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl bg-green-500/20 text-green-400">
            +
          </div>
          <div>
            <h3 className="text-3xl font-semibold text-white">{activeCount}</h3>
            <span className="text-xs text-gray-400 uppercase tracking-wide">Active</span>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl bg-gray-600/20 text-gray-400">
            -
          </div>
          <div>
            <h3 className="text-3xl font-semibold text-white">{inactiveCount}</h3>
            <span className="text-xs text-gray-400 uppercase tracking-wide">Inactive</span>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl bg-purple-500/20 text-purple-400">
            C
          </div>
          <div>
            <h3 className="text-3xl font-semibold text-white">{companiesCount}</h3>
            <span className="text-xs text-gray-400 uppercase tracking-wide">Companies</span>
          </div>
        </div>
      </div>

      {/* Portals Table */}
      <PortalsTable portals={portals} health={health} />
    </div>
  );
}
