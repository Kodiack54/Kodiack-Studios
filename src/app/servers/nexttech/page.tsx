import { getHealth, getStatus, getSops, getWorkflows, getOperations } from './api';
import ServerStatus from './components/ServerStatus';
import SopsList from './components/SopsList';
import WorkflowsList from './components/WorkflowsList';
import Link from 'next/link';

export default async function NextTechPage() {
  let health: any = null;
  let status: any = null;
  let sops: any[] = [];
  let workflows: any[] = [];
  let operations: any[] = [];
  let error: string | null = null;

  try {
    const [healthRes, statusRes, sopsRes, workflowsRes, operationsRes] = await Promise.all([
      getHealth().catch(() => null),
      getStatus().catch(() => null),
      getSops().catch(() => ({ sops: [] })),
      getWorkflows().catch(() => ({ workflows: [] })),
      getOperations().catch(() => ({ operations: [] }))
    ]);

    health = healthRes;
    status = statusRes;
    sops = (sopsRes as any).sops || [];
    workflows = (workflowsRes as any).workflows || [];
    operations = (operationsRes as any).operations || [];
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-700">
        <div>
          <h2 className="text-2xl font-semibold text-white">NextTech</h2>
          <p className="text-gray-400 text-sm">7105 - Tech App / Operations / SOP Tool</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/servers/nexttech/credentials"
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
          <div className="text-3xl font-semibold text-white mb-1">{sops.length}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">SOPs</div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <div className="text-3xl font-semibold text-blue-400 mb-1">{workflows.length}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">Workflows</div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <div className="text-3xl font-semibold text-green-400 mb-1">{operations.length}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">Operations</div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <div className="text-3xl font-semibold text-yellow-400 mb-1">
            {status?.active_workflows || 0}
          </div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">Active</div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-2 gap-6">
        {/* SOPs */}
        <SopsList sops={sops} />

        {/* Workflows */}
        <WorkflowsList workflows={workflows} />
      </div>
    </div>
  );
}
