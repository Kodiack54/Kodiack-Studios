'use client';

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

interface SystemTicketsTableProps {
  tickets: SystemTicket[];
  compact?: boolean;
}

export default function SystemTicketsTable({ tickets, compact = false }: SystemTicketsTableProps) {
  const priorityColors: Record<string, string> = {
    low: 'bg-gray-500/20 text-gray-400',
    normal: 'bg-blue-500/20 text-blue-400',
    high: 'bg-yellow-500/20 text-yellow-400',
    critical: 'bg-red-500/20 text-red-400',
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

  if (tickets.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No system tickets found
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tickets.map((ticket) => (
        <Link
          key={ticket.id}
          href={`/helpdesk/system-tickets/${ticket.id}`}
          className={`block bg-gray-900 border border-gray-700 rounded-lg ${compact ? 'p-3' : 'p-4'} hover:bg-blue-500/5 hover:border-blue-500/30 transition-colors`}
        >
          <div className="flex items-start gap-3">
            {/* Type Icon */}
            <div className="text-lg mt-0.5">{typeIcons[ticket.type] || '📋'}</div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`font-medium text-white ${compact ? 'text-sm' : ''} truncate`}>
                  {ticket.title}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded ${priorityColors[ticket.priority]}`}>
                  {ticket.priority}
                </span>
              </div>

              {!compact && ticket.description && (
                <div className="text-xs text-gray-500 mb-2 line-clamp-1">
                  {ticket.description}
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded ${statusColors[ticket.status]}`}>
                  {ticket.status.replace('_', ' ')}
                </span>
                <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                  {ticket.project}
                </span>
                {ticket.assignee && (
                  <span className="text-xs text-gray-500">
                    → {ticket.assignee}
                  </span>
                )}
                {!compact && (
                  <span className="text-xs text-gray-600 ml-auto">
                    #{ticket.id.slice(0, 8)}
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
