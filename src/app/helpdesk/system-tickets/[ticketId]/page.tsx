import Link from 'next/link';
import { getSystemTicket, getSystemTicketComments, getAssignableUsers } from '../../api';
import TicketDetail from './components/TicketDetail';
import TicketComments from './components/TicketComments';
import TicketActions from './components/TicketActions';

interface PageProps {
  params: Promise<{ ticketId: string }>;
}

export default async function SystemTicketDetailPage({ params }: PageProps) {
  const { ticketId } = await params;
  let ticket: any = null;
  let comments: any[] = [];
  let assignableUsers: any[] = [];
  let error: string | null = null;

  try {
    [ticket, comments, assignableUsers] = await Promise.all([
      getSystemTicket(ticketId).catch(() => null),
      getSystemTicketComments(ticketId).catch(() => []),
      getAssignableUsers().catch(() => []),
    ]);
  } catch (e) {
    error = (e as Error).message;
  }

  if (!ticket && !error) {
    error = 'Ticket not found';
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
            <span className="text-white">#{ticketId.slice(0, 8)}</span>
          </div>
          <h2 className="text-2xl font-semibold text-white">
            {ticket?.title || 'Loading...'}
          </h2>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-500/15 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}

      {ticket && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <TicketDetail ticket={ticket} />
            <TicketComments ticketId={ticketId} comments={comments} />
          </div>

          {/* Sidebar */}
          <div>
            <TicketActions
              ticket={ticket}
              assignableUsers={assignableUsers}
            />
          </div>
        </div>
      )}
    </div>
  );
}
