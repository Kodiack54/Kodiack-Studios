'use client';

import { useEffect, useState } from 'react';

interface Activity {
  id: string;
  type: 'deploy' | 'ticket' | 'task' | 'system' | 'user';
  message: string;
  project?: string;
  user?: string;
  timestamp: string;
}

export default function RecentActivity() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch recent activity
    const fetchActivity = async () => {
      try {
        const res = await fetch('/api/dashboard/activity');
        const data = await res.json();
        setActivities(data.activities || []);
      } catch {
        // Use mock data if API fails
        setActivities([
          { id: '1', type: 'deploy', message: 'Deployed tradelines to production', project: 'tradelines', user: 'dev', timestamp: new Date(Date.now() - 300000).toISOString() },
          { id: '2', type: 'ticket', message: 'New support ticket created', project: 'helpdesk', timestamp: new Date(Date.now() - 600000).toISOString() },
          { id: '3', type: 'system', message: 'NextBidder server restarted', project: 'nextbidder', timestamp: new Date(Date.now() - 1200000).toISOString() },
          { id: '4', type: 'task', message: 'Task "Fix login bug" completed', project: 'nexttask', user: 'john', timestamp: new Date(Date.now() - 3600000).toISOString() },
          { id: '5', type: 'user', message: 'New team member added', user: 'admin', timestamp: new Date(Date.now() - 7200000).toISOString() },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, []);

  const typeIcons: Record<string, string> = {
    deploy: '🚀',
    ticket: '🎫',
    task: '✅',
    system: '⚙️',
    user: '👤',
  };

  const typeColors: Record<string, string> = {
    deploy: 'bg-green-500/20 text-green-400',
    ticket: 'bg-purple-500/20 text-purple-400',
    task: 'bg-blue-500/20 text-blue-400',
    system: 'bg-yellow-500/20 text-yellow-400',
    user: 'bg-pink-500/20 text-pink-400',
  };

  const getTimeSince = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
      <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-700 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-900/50"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${typeColors[activity.type]}`}>
                {typeIcons[activity.type]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white">{activity.message}</div>
                <div className="text-xs text-gray-500">
                  {activity.project && <span className="text-blue-400">{activity.project}</span>}
                  {activity.project && activity.user && ' · '}
                  {activity.user && <span>{activity.user}</span>}
                  {(activity.project || activity.user) && ' · '}
                  {getTimeSince(activity.timestamp)}
                </div>
              </div>
            </div>
          ))}

          {activities.length === 0 && (
            <div className="text-center py-8 text-gray-500 text-sm">
              No recent activity
            </div>
          )}
        </div>
      )}
    </div>
  );
}
