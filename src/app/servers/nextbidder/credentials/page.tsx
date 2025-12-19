import { getCredentials } from '../api';
import CredentialsEditor from './components/CredentialsEditor';
import Link from 'next/link';

export default async function NextBidderCredentialsPage() {
  let credentials: any = {};
  let error: string | null = null;

  try {
    credentials = await getCredentials().catch(() => ({}));
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-700">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <Link href="/servers/nextbidder" className="hover:text-white transition-colors">
              NextBidder
            </Link>
            <span>/</span>
            <span className="text-white">Credentials</span>
          </div>
          <h2 className="text-2xl font-semibold text-white">NextBidder Credentials</h2>
          <p className="text-gray-400 text-sm">
            API keys and authentication for auction house integrations
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-500/15 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Credentials Editor */}
      <CredentialsEditor credentials={credentials} />
    </div>
  );
}
