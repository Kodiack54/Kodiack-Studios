'use client';

interface UserTicketDetailProps {
  ticket: {
    id: string;
    title: string;
    description?: string;
    status: string;
    priority: string;
    category: string;
    user_id: string;
    user_email: string;
    user_name?: string;
    created_at: string;
    updated_at: string;
  };
}

export default function UserTicketDetail({ ticket }: UserTicketDetailProps) {
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
      {/* User Info */}
      <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-700">
        <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-lg font-bold">
          {ticket.user_name?.charAt(0) || ticket.user_email?.charAt(0) || '?'}
        </div>
        <div>
          <div className="font-medium text-white">{ticket.user_name || 'Unknown User'}</div>
          <div className="text-sm text-gray-400">{ticket.user_email}</div>
        </div>
      </div>

      {/* Metadata Bar */}
      <div className="flex items-center gap-3 mb-4">
        <span className={`text-xs px-2 py-1 rounded ${statusColors[ticket.status]}`}>
          {ticket.status.replace(/_/g, ' ')}
        </span>
        <span className={`text-xs px-2 py-1 rounded ${priorityColors[ticket.priority]}`}>
          {ticket.priority}
        </span>
        <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
          {ticket.category}
        </span>
      </div>

      {/* Original Message */}
      <div className="bg-gray-900 rounded-lg p-4">
        <div className="text-xs text-gray-500 mb-2">Original Message</div>
        {ticket.description ? (
          <div className="text-gray-300 whitespace-pre-wrap">{ticket.description}</div>
        ) : (
          <div className="text-gray-500 italic">No description provided</div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-700 text-xs text-gray-500">
        <span>Created {formatDate(ticket.created_at)}</span>
        <span>·</span>
        <span>Updated {formatDate(ticket.updated_at)}</span>
      </div>
    </div>
  );
}
