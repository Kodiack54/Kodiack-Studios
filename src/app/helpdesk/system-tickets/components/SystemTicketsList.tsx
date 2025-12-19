'use client';

import { useState } from 'react';
import Link from 'next/link';

interface SystemTicket {
  id: string;
  title: string;
  description?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'critical';
  type: 'bug' | 'feature' | 'improvement' | 'task';
  project: string;
  assignee?: string;
  reporter: string;
  labels?: string[];
  created_at: string;
  updated_at: string;
}

interface Project {
  id: string;
  name: string;
}

interface SystemTicketsListProps {
  tickets: SystemTicket[];
  projects: Project[];
}

export default function SystemTicketsList({ tickets, projects }: SystemTicketsListProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const filteredTickets = tickets.filter((ticket) => {
    if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && ticket.priority !== priorityFilter) return false;
    if (projectFilter !== 'all' && ticket.project !== projectFilter) return false;
    if (typeFilter !== 'all' && ticket.type !== typeFilter) return false;
    if (search && !ticket.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const priorityColors: Record<string, string> = {
    low: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    normal: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    high: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const statusColors: Record<string, string> = {
    open: 'bg-blue-500/20 text-blue-400',
    in_progress: 'bg-yellow-500/20 text-yellow-400',
    resolved: 'bg-green-500/20 text-green-400',
    closed: 'bg-gray-500/20 text-gray-400',
  };

  const typeIcons: Record<string, string> = {
    bug: '🐛',
    feature: '✨',
    improvement: '📈',
    task: '📋',
  };

  const getTimeSince = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  return (
    <div>
      {/* Filters */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <input
            type="text"
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          {/* Priority */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Priority</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>

          {/* Type */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="bug">Bug</option>
            <option value="feature">Feature</option>
            <option value="improvement">Improvement</option>
            <option value="task">Task</option>
          </select>

          {/* Project */}
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Quick Filters */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => { setStatusFilter('open'); setPriorityFilter('critical'); }}
            className="px-3 py-1 text-xs rounded-lg bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white transition-colors"
          >
            Critical Only
          </button>
          <button
            onClick={() => { setStatusFilter('open'); setTypeFilter('bug'); }}
            className="px-3 py-1 text-xs rounded-lg bg-orange-500/15 text-orange-400 border border-orange-500/30 hover:bg-orange-500 hover:text-white transition-colors"
          >
            Open Bugs
          </button>
          <button
            onClick={() => { setStatusFilter('all'); setPriorityFilter('all'); setTypeFilter('all'); setProjectFilter('all'); setSearch(''); }}
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
            href={`/helpdesk/system-tickets/${ticket.id}`}
            className="block bg-gray-800 border border-gray-700 rounded-xl p-4 hover:bg-blue-500/5 hover:border-blue-500/30 transition-colors"
          >
            <div className="flex items-start gap-4">
              {/* Type Icon */}
              <div className="text-2xl">{typeIcons[ticket.type] || '📋'}</div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-white">{ticket.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded border ${priorityColors[ticket.priority]}`}>
                    {ticket.priority}
                  </span>
                </div>

                {ticket.description && (
                  <div className="text-sm text-gray-500 mb-3 line-clamp-2">
                    {ticket.description}
                  </div>
                )}

                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded ${statusColors[ticket.status]}`}>
                    {ticket.status.replace('_', ' ')}
                  </span>
                  <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                    {ticket.project}
                  </span>
                  {ticket.labels?.map((label) => (
                    <span key={label} className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">
                      {label}
                    </span>
                  ))}
                  <span className="text-xs text-gray-600">
                    by {ticket.reporter}
                  </span>
                  {ticket.assignee && (
                    <span className="text-xs text-gray-500">
                      → {ticket.assignee}
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
