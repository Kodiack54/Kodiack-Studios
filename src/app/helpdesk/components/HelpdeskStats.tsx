'use client';

interface HelpdeskStatsProps {
  stats: {
    system_tickets?: {
      total: number;
      open: number;
      in_progress: number;
      closed: number;
      critical: number;
    };
    user_tickets?: {
      total: number;
      open: number;
      awaiting_response: number;
      resolved: number;
      avg_response_time: string;
    };
  };
}

export default function HelpdeskStats({ stats }: HelpdeskStatsProps) {
  const systemStats = stats?.system_tickets || {
    total: 0,
    open: 0,
    in_progress: 0,
    closed: 0,
    critical: 0,
  };

  const userStats = stats?.user_tickets || {
    total: 0,
    open: 0,
    awaiting_response: 0,
    resolved: 0,
    avg_response_time: '--',
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* System Tickets Open */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <div className="text-xs text-gray-500 mb-1">System Open</div>
        <div className="text-2xl font-bold text-blue-400">{systemStats.open}</div>
        <div className="text-xs text-gray-500 mt-1">
          {systemStats.in_progress} in progress
        </div>
      </div>

      {/* Critical Issues */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <div className="text-xs text-gray-500 mb-1">Critical Issues</div>
        <div className={`text-2xl font-bold ${systemStats.critical > 0 ? 'text-red-400' : 'text-green-400'}`}>
          {systemStats.critical}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          needs immediate attention
        </div>
      </div>

      {/* User Tickets Awaiting */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <div className="text-xs text-gray-500 mb-1">Awaiting Response</div>
        <div className={`text-2xl font-bold ${userStats.awaiting_response > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
          {userStats.awaiting_response}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          user tickets pending
        </div>
      </div>

      {/* Avg Response Time */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <div className="text-xs text-gray-500 mb-1">Avg Response Time</div>
        <div className="text-2xl font-bold text-purple-400">{userStats.avg_response_time}</div>
        <div className="text-xs text-gray-500 mt-1">
          {userStats.resolved} resolved this week
        </div>
      </div>
    </div>
  );
}
