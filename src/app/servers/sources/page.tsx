import { getHealth, getStatus, getSources, getQueue } from './api';
import ServerStatus from './components/ServerStatus';
import SourcesList from './components/SourcesList';
import QueuePanel from './components/QueuePanel';
import Link from 'next/link';

export default async function SourcesPage() {
  let health: any = null;
  let status: any = null;
  let sources: any[] = [];
  let queue: any[] = [];
  let error: string | null = null;

  try {
    const [healthRes, statusRes, sourcesRes, queueRes] = await Promise.all([
      getHealth().catch(() => null),
      getStatus().catch(() => null),
      getSources().catch(() => ({ sources: [] })),
      getQueue().catch(() => ({ queue: [] }))
    ]);

    health = healthRes;
    status = statusRes;
    sources = (sourcesRes as any).sources || [];
    queue = (queueRes as any).queue || [];
  } catch (e) {
    error = (e as Error).message;
  }

  const serviceSources = sources.filter((s: any) => s.type === 'service');
  const suppliersSources = sources.filter((s: any) => s.type === 'suppliers');

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-700">
        <div>
          <h2 className="text-2xl font-semibold text-white">Sources Discovery</h2>
          <p className="text-gray-400 text-sm">7104 - New Sources Discovery Server (Service & Suppliers)</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/servers/sources/credentials"
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
          <div className="text-xs text-gray-400 uppercase tracking-wide">Total Sources</div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <div className="text-3xl font-semibold text-blue-400 mb-1">{serviceSources.length}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">Service Sources</div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <div className="text-3xl font-semibold text-green-400 mb-1">{suppliersSources.length}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">Supplier Sources</div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <div className="text-3xl font-semibold text-yellow-400 mb-1">{queue.length}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">In Queue</div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-3 gap-6">
        {/* Sources List - 2 columns */}
        <div className="col-span-2">
          <SourcesList sources={sources} />
        </div>

        {/* Queue Panel - 1 column */}
        <div>
          <QueuePanel queue={queue} />
        </div>
      </div>
    </div>
  );
}
