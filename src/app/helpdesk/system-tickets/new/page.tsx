import Link from 'next/link';
import { getProjects, getLabels, getAssignableUsers } from '../../api';
import NewSystemTicketForm from './components/NewSystemTicketForm';

export default async function NewSystemTicketPage() {
  let projects: any[] = [];
  let labels: any[] = [];
  let assignableUsers: any[] = [];
  let error: string | null = null;

  try {
    [projects, labels, assignableUsers] = await Promise.all([
      getProjects().catch(() => [
        { id: 'tradelines', name: 'Tradelines (7101)' },
        { id: 'portals', name: 'Portals (7102)' },
        { id: 'nextbidder', name: 'NextBidder (7103)' },
        { id: 'sources', name: 'Sources (7104)' },
        { id: 'nexttech', name: 'NextTech (7105)' },
        { id: 'nexttask', name: 'NextTask (7106)' },
        { id: 'dashboard', name: 'Dashboard' },
        { id: 'infrastructure', name: 'Infrastructure' },
      ]),
      getLabels().catch(() => []),
      getAssignableUsers().catch(() => []),
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
            <Link href="/helpdesk" className="hover:text-white transition-colors">
              Helpdesk
            </Link>
            <span>/</span>
            <Link href="/helpdesk/system-tickets" className="hover:text-white transition-colors">
              System Tickets
            </Link>
            <span>/</span>
            <span className="text-white">New</span>
          </div>
          <h2 className="text-2xl font-semibold text-white">Create System Ticket</h2>
          <p className="text-gray-400 text-sm">
            Report a bug, request a feature, or create a task
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-500/15 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Form */}
      <NewSystemTicketForm
        projects={projects}
        labels={labels}
        assignableUsers={assignableUsers}
      />
    </div>
  );
}
