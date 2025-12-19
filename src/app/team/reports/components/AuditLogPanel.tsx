'use client';

interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  resource: string;
  resource_id?: string;
  details?: string;
  ip_address?: string;
  created_at: string;
}

interface AuditLogPanelProps {
  logs: AuditLog[];
}

export default function AuditLogPanel({ logs }: AuditLogPanelProps) {
  const actionColors: Record<string, string> = {
    login: 'bg-green-500/20 text-green-400',
    logout: 'bg-gray-500/20 text-gray-400',
    create: 'bg-blue-500/20 text-blue-400',
    update: 'bg-yellow-500/20 text-yellow-400',
    delete: 'bg-red-500/20 text-red-400',
    view: 'bg-purple-500/20 text-purple-400',
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const getTimeSince = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
      <h3 className="text-lg font-semibold text-white mb-4">Audit Log</h3>

      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {logs.map((log) => (
          <div
            key={log.id}
            className="bg-gray-900 rounded-lg p-3"
          >
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded ${actionColors[log.action] || actionColors.view}`}>
                  {log.action}
                </span>
                <span className="text-sm font-medium text-white">{log.user_name}</span>
              </div>
              <span className="text-xs text-gray-600" title={formatTime(log.created_at)}>
                {getTimeSince(log.created_at)}
              </span>
            </div>

            <div className="text-xs text-gray-400">
              {log.action} {log.resource}
              {log.resource_id && <span className="text-gray-600"> #{log.resource_id.slice(0, 8)}</span>}
            </div>

            {log.details && (
              <div className="text-xs text-gray-500 mt-1">{log.details}</div>
            )}

            {log.ip_address && (
              <div className="text-xs text-gray-600 mt-1">IP: {log.ip_address}</div>
            )}
          </div>
        ))}

        {logs.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            No audit log entries
          </div>
        )}
      </div>
    </div>
  );
}
