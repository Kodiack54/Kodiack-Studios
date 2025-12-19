'use client';

import { useState } from 'react';
import { RoleGate, PermissionButton } from '@/app/settings/RoleGate';

interface Deployment {
  id: string;
  project: string;
  environment: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'rolled_back';
  branch: string;
  commit?: string;
  user: string;
  notes?: string;
  created_at: string;
  completed_at?: string;
}

interface DeploymentsListProps {
  deployments: Deployment[];
}

export default function DeploymentsList({ deployments }: DeploymentsListProps) {
  const [projectFilter, setProjectFilter] = useState('all');
  const [envFilter, setEnvFilter] = useState('all');

  const filteredDeployments = deployments.filter((d) => {
    if (projectFilter !== 'all' && d.project !== projectFilter) return false;
    if (envFilter !== 'all' && d.environment !== envFilter) return false;
    return true;
  });

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    running: 'bg-blue-500/20 text-blue-400',
    success: 'bg-green-500/20 text-green-400',
    failed: 'bg-red-500/20 text-red-400',
    rolled_back: 'bg-orange-500/20 text-orange-400',
  };

  const envColors: Record<string, string> = {
    development: 'border-gray-500/30',
    staging: 'border-blue-500/30',
    production: 'border-green-500/30',
  };

  const projects = [...new Set(deployments.map((d) => d.project))];

  const handleRollback = async (deploymentId: string) => {
    if (!confirm('Are you sure you want to rollback this deployment?')) return;

    try {
      const res = await fetch(`/api/dev-controls/deployments/${deploymentId}/rollback`, {
        method: 'POST',
      });
      const result = await res.json();
      if (result.success) {
        alert('Rollback initiated');
        window.location.reload();
      } else {
        alert(result.error || 'Rollback failed');
      }
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div>
      {/* Filters */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-6">
        <div className="flex gap-4">
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <select
            value={envFilter}
            onChange={(e) => setEnvFilter(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none"
          >
            <option value="all">All Environments</option>
            <option value="development">Development</option>
            <option value="staging">Staging</option>
            <option value="production">Production</option>
          </select>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filteredDeployments.map((deployment) => (
          <div
            key={deployment.id}
            className={`bg-gray-800 border-l-4 ${envColors[deployment.environment]} border border-gray-700 rounded-xl p-4`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-white">{deployment.project}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${statusColors[deployment.status]}`}>
                    {deployment.status}
                  </span>
                  <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                    {deployment.environment}
                  </span>
                </div>
                <div className="text-sm text-gray-400 mb-1">
                  Branch: <code className="text-blue-400">{deployment.branch}</code>
                  {deployment.commit && (
                    <span> @ <code className="text-purple-400">{deployment.commit.slice(0, 7)}</code></span>
                  )}
                </div>
                {deployment.notes && (
                  <div className="text-xs text-gray-500">{deployment.notes}</div>
                )}
              </div>

              <div className="text-right">
                <div className="text-xs text-gray-500 mb-2">
                  {formatDate(deployment.created_at)}
                </div>
                <div className="text-xs text-gray-600 mb-2">by {deployment.user}</div>

                {deployment.status === 'success' && deployment.environment === 'production' && (
                  <RoleGate permission="canPushToProd">
                    <button
                      onClick={() => handleRollback(deployment.id)}
                      className="px-3 py-1 text-xs font-semibold rounded bg-orange-500/15 text-orange-400 border border-orange-500/30 hover:bg-orange-500 hover:text-white transition-colors"
                    >
                      Rollback
                    </button>
                  </RoleGate>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredDeployments.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No deployments found
          </div>
        )}
      </div>
    </div>
  );
}
