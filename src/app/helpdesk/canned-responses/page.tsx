import Link from 'next/link';
import { getCannedResponses } from '../api';
import CannedResponsesList from './components/CannedResponsesList';

export default async function CannedResponsesPage() {
  let responses: any[] = [];
  let error: string | null = null;

  try {
    responses = await getCannedResponses().catch(() => []);
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-700">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <Link href="/helpdesk" className="hover:text-white transition-colors">
              Helpdesk
            </Link>
            <span>/</span>
            <span className="text-white">Canned Responses</span>
          </div>
          <h2 className="text-2xl font-semibold text-white">Canned Responses</h2>
          <p className="text-gray-400 text-sm">
            Pre-written responses for common support scenarios
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-500/15 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Canned Responses List */}
      <CannedResponsesList responses={responses} />
    </div>
  );
}
