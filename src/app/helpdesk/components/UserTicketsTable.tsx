'use client';

import Link from 'next/link';

interface UserTicket {
  id: string;
  title: string;
  description?: string;
  status: 'open' | 'awaiting_response' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: string;
  source_system?: 'portal' | 'nextbidder' | 'nexttech' | 'nexttask' | 'sources';
  user_id: string; // e.g., portal_user_123, nextbidder_user_456
  user_email: string;
  user_name?: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  last_response_at?: string;
}

interface UserTicketsTableProps {
  tickets: UserTicket[];
  compact?: boolean;
}

export default function UserTicketsTable({ tickets, compact = false }: UserTicketsTableProps) {
  const priorityColors: Record<string, string> = {
    low: 'bg-gray-500/20 text-gray-400',
    normal: 'bg-blue-500/20 text-blue-400',
    high: 'bg-yellow-500/20 text-yellow-400',
    urgent: 'bg-red-500/20 text-red-400',
  };

  const statusColors: Record<string, string> = {
    open: 'bg-blue-500/20 text-blue-400',
    awaiting_response: 'bg-yellow-500/20 text-yellow-400',
    in_progress: 'bg-purple-500/20 text-purple-400',
    resolved: 'bg-green-500/20 text-green-400',
    closed: 'bg-gray-500/20 text-gray-400',
  };

  const sourceColors: Record<string, string> = {
    portal: 'bg-green-500/20 text-green-400',
    nextbidder: 'bg-purple-500/20 text-purple-400',
    nexttech: 'bg-pink-500/20 text-pink-400',
    nexttask: 'bg-orange-500/20 text-orange-400',
    sources: 'bg-yellow-500/20 text-yellow-400',
  };

  // Extract source system from user_id if not provided (e.g., portal_user_123 -> portal)
  const getSourceSystem = (ticket: UserTicket) => {
    if (ticket.source_system) return ticket.source_system;
    const match = ticket.user_id.match(/^(portal|nextbidder|nexttech|nexttask|sources)_user/);
    return match ? match[1] : null;
  };

  const getTimeSince = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'just now';
  };

  if (tickets.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No user tickets found
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tickets.map((ticket) => (
        <Link
          key={ticket.id}
          href={`/helpdesk/user-tickets/${ticket.id}`}
          className={`block bg-gray-900 border border-gray-700 rounded-lg ${compact ? 'p-3' : 'p-4'} hover:bg-purple-500/5 hover:border-purple-500/30 transition-colors`}
        >
          <div className="flex items-start gap-3">
            {/* User Avatar */}
            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-sm font-bold">
              {ticket.user_name?.charAt(0) || ticket.user_email?.charAt(0) || '?'}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`font-medium text-white ${compact ? 'text-sm' : ''} truncate`}>
                  {ticket.title}
                </span>
                {ticket.status === 'awaiting_response' && (
                  <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                )}
              </div>

              {!compact && (
                <div className="text-xs text-gray-500 mb-2">
                  {ticket.user_name || ticket.user_email} · {getTimeSince(ticket.created_at)}
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded ${statusColors[ticket.status]}`}>
                  {ticket.status.replace('_', ' ')}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded ${priorityColors[ticket.priority]}`}>
                  {ticket.priority}
                </span>
                {getSourceSystem(ticket) && (
                  <span className={`text-xs px-2 py-0.5 rounded ${sourceColors[getSourceSystem(ticket)!]}`}>
                    {getSourceSystem(ticket)}
                  </span>
                )}
                <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                  {ticket.category}
                </span>
                {compact && (
                  <span className="text-xs text-gray-600 ml-auto">
                    {getTimeSince(ticket.created_at)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
