'use client';

import { useState } from 'react';
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

interface Category {
  id: string;
  name: string;
}

interface UserTicketsListProps {
  tickets: UserTicket[];
  categories: Category[];
}

export default function UserTicketsList({ tickets, categories }: UserTicketsListProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Extract source system from user_id (e.g., portal_user_123 -> portal)
  const getSourceSystem = (ticket: UserTicket) => {
    if (ticket.source_system) return ticket.source_system;
    const match = ticket.user_id.match(/^(portal|nextbidder|nexttech|nexttask|sources)_user/);
    return match ? match[1] : null;
  };

  const filteredTickets = tickets.filter((ticket) => {
    if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && ticket.priority !== priorityFilter) return false;
    if (categoryFilter !== 'all' && ticket.category !== categoryFilter) return false;
    if (sourceFilter !== 'all' && getSourceSystem(ticket) !== sourceFilter) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      if (
        !ticket.title.toLowerCase().includes(searchLower) &&
        !ticket.user_email.toLowerCase().includes(searchLower) &&
        !(ticket.user_name || '').toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }
    return true;
  });

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

  // Count awaiting response tickets
  const awaitingCount = tickets.filter((t) => t.status === 'awaiting_response').length;

  return (
    <div>
      {/* Alert for awaiting tickets */}
      {awaitingCount > 0 && (
        <div className="bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 px-4 py-3 rounded-lg mb-6 flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          <span>{awaitingCount} ticket{awaitingCount > 1 ? 's' : ''} awaiting your response</span>
          <button
            onClick={() => setStatusFilter('awaiting_response')}
            className="ml-auto text-xs px-3 py-1 rounded bg-yellow-500/20 hover:bg-yellow-500 hover:text-black transition-colors"
          >
            View
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <input
            type="text"
            placeholder="Search tickets or users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
          />

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="awaiting_response">Awaiting Response</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          {/* Priority */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
          >
            <option value="all">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>

          {/* Category */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Source System */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
          >
            <option value="all">All Sources</option>
            <option value="portal">Portal</option>
            <option value="nextbidder">NextBidder</option>
            <option value="nexttech">NextTech</option>
            <option value="nexttask">NextTask</option>
            <option value="sources">Sources</option>
          </select>
        </div>

        {/* Quick Filters */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setStatusFilter('awaiting_response')}
            className="px-3 py-1 text-xs rounded-lg bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500 hover:text-black transition-colors"
          >
            Needs Response
          </button>
          <button
            onClick={() => { setStatusFilter('open'); setPriorityFilter('urgent'); }}
            className="px-3 py-1 text-xs rounded-lg bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white transition-colors"
          >
            Urgent
          </button>
          <button
            onClick={() => { setStatusFilter('all'); setPriorityFilter('all'); setCategoryFilter('all'); setSourceFilter('all'); setSearch(''); }}
            className="px-3 py-1 text-xs rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-400 mb-4">
        Showing {filteredTickets.length} of {tickets.length} tickets
      </div>

      {/* Tickets List */}
      <div className="space-y-3">
        {filteredTickets.map((ticket) => (
          <Link
            key={ticket.id}
            href={`/helpdesk/user-tickets/${ticket.id}`}
            className="block bg-gray-800 border border-gray-700 rounded-xl p-4 hover:bg-purple-500/5 hover:border-purple-500/30 transition-colors"
          >
            <div className="flex items-start gap-4">
              {/* User Avatar */}
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold">
                {ticket.user_name?.charAt(0) || ticket.user_email?.charAt(0) || '?'}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-white">{ticket.title}</span>
                  {ticket.status === 'awaiting_response' && (
                    <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                  )}
                </div>

                <div className="text-sm text-gray-500 mb-2">
                  {ticket.user_name || ticket.user_email}
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded ${statusColors[ticket.status]}`}>
                    {ticket.status.replace(/_/g, ' ')}
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
                  {ticket.assigned_to && (
                    <span className="text-xs text-gray-500">
                      Assigned: {ticket.assigned_to}
                    </span>
                  )}
                  <span className="text-xs text-gray-600 ml-auto">
                    {getTimeSince(ticket.created_at)}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}

        {filteredTickets.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No tickets match your filters
          </div>
        )}
      </div>
    </div>
  );
}
