'use client';

interface TicketDetailProps {
  ticket: {
    id: string;
    title: string;
    description?: string;
    status: string;
    priority: string;
    type: string;
    project: string;
    reporter: string;
    created_at: string;
    updated_at: string;
    labels?: string[];
  };
}

export default function TicketDetail({ ticket }: TicketDetailProps) {
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
      {/* Metadata Bar */}
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-700">
        <span className="text-2xl">{typeIcons[ticket.type] || '📋'}</span>
        <span className={`text-xs px-2 py-1 rounded ${statusColors[ticket.status]}`}>
          {ticket.status.replace('_', ' ')}
        </span>
        <span className={`text-xs px-2 py-1 rounded border ${priorityColors[ticket.priority]}`}>
          {ticket.priority}
        </span>
        <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
          {ticket.project}
        </span>
        {ticket.labels?.map((label) => (
          <span key={label} className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
            {label}
          </span>
        ))}
      </div>

      {/* Description */}
      <div className="prose prose-invert max-w-none">
        {ticket.description ? (
          <div className="text-gray-300 whitespace-pre-wrap">{ticket.description}</div>
        ) : (
          <div className="text-gray-500 italic">No description provided</div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-4 mt-6 pt-4 border-t border-gray-700 text-xs text-gray-500">
        <span>Reported by {ticket.reporter}</span>
        <span>·</span>
        <span>Created {formatDate(ticket.created_at)}</span>
        <span>·</span>
        <span>Updated {formatDate(ticket.updated_at)}</span>
      </div>
    </div>
  );
}
