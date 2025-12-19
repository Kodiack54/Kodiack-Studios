'use client';

interface ActivityReportProps {
  report: {
    total_actions: number;
    active_users: number;
    top_users: Array<{
      user_id: string;
      name: string;
      actions: number;
    }>;
    actions_by_type: Record<string, number>;
  } | null;
}

export default function ActivityReport({ report }: ActivityReportProps) {
  const data = report || {
    total_actions: 0,
    active_users: 0,
    top_users: [],
    actions_by_type: {},
  };

  const actionColors: Record<string, string> = {
    login: 'bg-green-500',
    view: 'bg-blue-500',
    edit: 'bg-yellow-500',
    create: 'bg-purple-500',
    delete: 'bg-red-500',
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
      <h3 className="text-lg font-semibold text-white mb-4">Activity Summary</h3>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-900 rounded-lg p-3">
          <div className="text-xs text-gray-500">Total Actions</div>
          <div className="text-xl font-bold text-white">{data.total_actions}</div>
        </div>
        <div className="bg-gray-900 rounded-lg p-3">
          <div className="text-xs text-gray-500">Active Users</div>
          <div className="text-xl font-bold text-green-400">{data.active_users}</div>
        </div>
      </div>

      {/* Actions by Type */}
      <div className="mb-6">
        <div className="text-sm font-medium text-gray-400 mb-3">Actions by Type</div>
        <div className="space-y-2">
          {Object.entries(data.actions_by_type).map(([type, count]) => {
            const total = data.total_actions || 1;
            const percentage = Math.round((count / total) * 100);

            return (
              <div key={type} className="flex items-center gap-3">
                <div className="w-16 text-xs text-gray-400 capitalize">{type}</div>
                <div className="flex-1 h-2 bg-gray-900 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${actionColors[type] || 'bg-gray-500'}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="w-12 text-xs text-gray-500 text-right">{count}</div>
              </div>
            );
          })}

          {Object.keys(data.actions_by_type).length === 0 && (
            <div className="text-center py-4 text-gray-500 text-sm">
              No activity data
            </div>
          )}
        </div>
      </div>

      {/* Top Users */}
      <div>
        <div className="text-sm font-medium text-gray-400 mb-3">Most Active Users</div>
        <div className="space-y-2">
          {data.top_users.slice(0, 5).map((user, index) => (
            <div
              key={user.user_id}
              className="flex items-center gap-3 bg-gray-900 rounded-lg p-2"
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                index === 1 ? 'bg-gray-400/20 text-gray-300' :
                index === 2 ? 'bg-orange-500/20 text-orange-400' :
                'bg-gray-700 text-gray-400'
              }`}>
                {index + 1}
              </div>
              <div className="flex-1 text-sm text-white">{user.name}</div>
              <div className="text-xs text-gray-500">{user.actions} actions</div>
            </div>
          ))}

          {data.top_users.length === 0 && (
            <div className="text-center py-4 text-gray-500 text-sm">
              No user activity data
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
