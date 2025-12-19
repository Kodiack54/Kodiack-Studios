import Link from 'next/link';
import { getUserTickets, getCategories } from '../api';
import UserTicketsList from './components/UserTicketsList';

export default async function UserTicketsPage() {
  let tickets: any[] = [];
  let categories: any[] = [];
  let error: string | null = null;

  try {
    [tickets, categories] = await Promise.all([
      getUserTickets({ limit: 50 }).catch(() => []),
      getCategories().catch(() => [
        { id: 'general', name: 'General' },
        { id: 'billing', name: 'Billing' },
        { id: 'technical', name: 'Technical' },
        { id: 'account', name: 'Account' },
        { id: 'feedback', name: 'Feedback' },
      ]),
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
            <span className="text-white">User Tickets</span>
          </div>
          <h2 className="text-2xl font-semibold text-white">User Support Tickets</h2>
          <p className="text-gray-400 text-sm">
            Customer support requests and feedback
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-500/15 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Tickets List with Filters */}
      <UserTicketsList tickets={tickets} categories={categories} />
    </div>
  );
}
