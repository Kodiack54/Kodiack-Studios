import Link from 'next/link';
import { getHealth, getStats, getSystemTickets, getUserTickets } from './api';
import HelpdeskStats from './components/HelpdeskStats';
import SystemTicketsTable from './components/SystemTicketsTable';
import UserTicketsTable from './components/UserTicketsTable';

export default async function HelpdeskPage() {
  let health: any = null;
  let stats: any = null;
  let systemTickets: any[] = [];
  let userTickets: any[] = [];
  let error: string | null = null;

  try {
    [health, stats, systemTickets, userTickets] = await Promise.all([
      getHealth().catch(() => ({ status: 'offline' })),
      getStats().catch(() => ({})),
      getSystemTickets({ limit: 10 }).catch(() => []),
      getUserTickets({ limit: 10 }).catch(() => []),
    ]);
  } catch (e) {
    error = (e as Error).message;
  }

  const isOnline = health?.status === 'healthy' || health?.status === 'online';

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-700">
        <div>
          <h2 className="text-2xl font-semibold text-white">Helpdesk</h2>
          <p className="text-gray-400 text-sm">
            System tickets & customer support management
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
            isOnline
              ? 'bg-green-500/15 text-green-400 border border-green-500/30'
              : 'bg-red-500/15 text-red-400 border border-red-500/30'
          }`}>
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
            {isOnline ? 'Online' : 'Offline'}
          </div>
          <Link
            href="/helpdesk/settings"
            className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-semibold hover:bg-gray-600 transition-colors"
          >
            Settings
          </Link>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-500/15 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Stats Overview */}
      <HelpdeskStats stats={stats} />

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Link
          href="/helpdesk/system-tickets/new"
          className="bg-gray-800 border border-gray-700 rounded-xl p-4 hover:bg-blue-500/10 hover:border-blue-500/30 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 text-lg">
              +
            </div>
            <div>
              <div className="font-medium text-white group-hover:text-blue-400 transition-colors">
                New System Ticket
              </div>
              <div className="text-xs text-gray-500">
                Report a bug or request a feature
              </div>
            </div>
          </div>
        </Link>

        <Link
          href="/helpdesk/user-tickets"
          className="bg-gray-800 border border-gray-700 rounded-xl p-4 hover:bg-purple-500/10 hover:border-purple-500/30 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 text-lg">
              📨
            </div>
            <div>
              <div className="font-medium text-white group-hover:text-purple-400 transition-colors">
                User Support Queue
              </div>
              <div className="text-xs text-gray-500">
                {stats?.user_tickets?.open || 0} tickets awaiting response
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-4 mb-6">
        <Link
          href="/helpdesk/system-tickets"
          className="px-4 py-2 bg-blue-500/15 text-blue-400 border border-blue-500/30 rounded-lg text-sm font-semibold hover:bg-blue-500 hover:text-white transition-colors"
        >
          All System Tickets
        </Link>
        <Link
          href="/helpdesk/user-tickets"
          className="px-4 py-2 bg-purple-500/15 text-purple-400 border border-purple-500/30 rounded-lg text-sm font-semibold hover:bg-purple-500 hover:text-white transition-colors"
        >
          All User Tickets
        </Link>
        <Link
          href="/helpdesk/canned-responses"
          className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-600 transition-colors"
        >
          Canned Responses
        </Link>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Tickets */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="text-blue-400">🔧</span>
              System Tickets
            </h3>
            <Link
              href="/helpdesk/system-tickets"
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              View All →
            </Link>
          </div>
          <SystemTicketsTable tickets={systemTickets} compact />
        </div>

        {/* User Tickets */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="text-purple-400">📩</span>
              User Tickets
            </h3>
            <Link
              href="/helpdesk/user-tickets"
              className="text-xs text-purple-400 hover:text-purple-300"
            >
              View All →
            </Link>
          </div>
          <UserTicketsTable tickets={userTickets} compact />
        </div>
      </div>
    </div>
  );
}
