import Link from 'next/link';
import { getSystemTickets, getProjects } from '../api';
import SystemTicketsList from './components/SystemTicketsList';

export default async function SystemTicketsPage() {
  let tickets: any[] = [];
  let projects: any[] = [];
  let error: string | null = null;

  try {
    [tickets, projects] = await Promise.all([
      getSystemTickets({ limit: 50 }).catch(() => []),
      getProjects().catch(() => []),
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
            <span className="text-white">System Tickets</span>
          </div>
          <h2 className="text-2xl font-semibold text-white">System Tickets</h2>
          <p className="text-gray-400 text-sm">
            Internal development issues, bugs, and feature requests
          </p>
        </div>
        <Link
          href="/helpdesk/system-tickets/new"
          className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors"
        >
          + New Ticket
        </Link>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-500/15 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Tickets List with Filters */}
      <SystemTicketsList tickets={tickets} projects={projects} />
    </div>
  );
}
