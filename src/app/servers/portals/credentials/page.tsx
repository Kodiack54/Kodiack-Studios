import { getCredentials, getPortals } from '../api';
import PortalCredentialsTable from './components/PortalCredentialsTable';
import Link from 'next/link';

export default async function PortalCredentialsPage({
  searchParams,
}: {
  searchParams: { portal?: string };
}) {
  let credentials: any = {};
  let portals: any[] = [];
  let error: string | null = null;

  try {
    const [credRes, portalsRes] = await Promise.all([
      getCredentials().catch(() => ({})),
      getPortals().catch(() => ({ portals: [] }))
    ]);

    credentials = credRes;
    portals = (portalsRes as any).portals || [];
  } catch (e) {
    error = (e as Error).message;
  }

  const selectedPortal = searchParams.portal;

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-700">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <Link href="/servers/portals" className="hover:text-white transition-colors">
              User Portals
            </Link>
            <span>/</span>
            <span className="text-white">Credentials</span>
          </div>
          <h2 className="text-2xl font-semibold text-white">Portal Credentials</h2>
          <p className="text-gray-400 text-sm">
            API keys, tokens, and authentication for user portals
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-500/15 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Portal Filter */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/servers/portals/credentials"
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              !selectedPortal
                ? 'bg-blue-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
            }`}
          >
            All Portals
          </Link>
          {portals.slice(0, 10).map((p: any) => (
            <Link
              key={p.id}
              href={`/servers/portals/credentials?portal=${p.id}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedPortal === p.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
              }`}
            >
              {p.name}
            </Link>
          ))}
          {portals.length > 10 && (
            <span className="px-3 py-1.5 text-sm text-gray-500">
              +{portals.length - 10} more
            </span>
          )}
        </div>
      </div>

      {/* Credentials Table */}
      <PortalCredentialsTable
        portals={portals}
        credentials={credentials}
        selectedPortal={selectedPortal}
      />
    </div>
  );
}
