'use client';

import Link from 'next/link';

interface Deployment {
  id: string;
  project: string;
  environment: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'rolled_back';
  branch: string;
  commit?: string;
  user: string;
  created_at: string;
  completed_at?: string;
}

interface DeploymentsPanelProps {
  deployments: Deployment[];
}

export default function DeploymentsPanel({ deployments }: DeploymentsPanelProps) {
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    running: 'bg-blue-500/20 text-blue-400',
    success: 'bg-green-500/20 text-green-400',
    failed: 'bg-red-500/20 text-red-400',
    rolled_back: 'bg-orange-500/20 text-orange-400',
  };

  const envColors: Record<string, string> = {
    development: 'bg-gray-500/20 text-gray-400',
    staging: 'bg-blue-500/20 text-blue-400',
    production: 'bg-green-500/20 text-green-400',
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
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Recent Deployments</h3>
        <Link href="/dev-controls/deploy" className="text-sm text-green-400 hover:text-green-300">
          View All →
        </Link>
      </div>

      <div className="space-y-3">
        {deployments.map((deployment) => (
          <div
            key={deployment.id}
            className="bg-gray-900 border border-gray-700 rounded-lg p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded ${statusColors[deployment.status]}`}>
                  {deployment.status === 'running' && '● '}{deployment.status}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded ${envColors[deployment.environment]}`}>
                  {deployment.environment}
                </span>
              </div>
              <span className="text-xs text-gray-600">{getTimeSince(deployment.created_at)}</span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-white text-sm">{deployment.project}</div>
                <div className="text-xs text-gray-500">
                  {deployment.branch}
                  {deployment.commit && ` @ ${deployment.commit.slice(0, 7)}`}
                </div>
              </div>
              <div className="text-xs text-gray-500">by {deployment.user}</div>
            </div>
          </div>
        ))}

        {deployments.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            No recent deployments
          </div>
        )}
      </div>
    </div>
  );
}
