import Link from 'next/link';
import { getActivityReport, getProductivityReport, getAuditLog } from '../api';
import ActivityReport from './components/ActivityReport';
import AuditLogPanel from './components/AuditLogPanel';

export default async function TeamReportsPage() {
  let activityReport: any = null;
  let auditLog: any[] = [];
  let error: string | null = null;

  try {
    [activityReport, auditLog] = await Promise.all([
      getActivityReport().catch(() => null),
      getAuditLog({ limit: 20 }).catch(() => []),
    ]);
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-700">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <Link href="/team" className="hover:text-white transition-colors">
              Team
            </Link>
            <span>/</span>
            <span className="text-white">Reports</span>
          </div>
          <h2 className="text-2xl font-semibold text-white">Team Reports</h2>
          <p className="text-gray-400 text-sm">
            Activity tracking and audit logs
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-500/15 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Report */}
        <ActivityReport report={activityReport} />

        {/* Audit Log */}
        <AuditLogPanel logs={auditLog} />
      </div>
    </div>
  );
}
