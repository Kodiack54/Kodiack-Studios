'use client';

import { useState } from 'react';

interface Workflow {
  id: string;
  name: string;
  description?: string;
  steps: number;
  status: string;
  last_run?: string;
  runs_count?: number;
}

interface WorkflowsListProps {
  workflows: Workflow[];
}

export default function WorkflowsList({ workflows }: WorkflowsListProps) {
  const [executing, setExecuting] = useState<string | null>(null);

  const handleExecute = async (workflowId: string) => {
    setExecuting(workflowId);
    try {
      const res = await fetch(`/api/nexttech/workflows/${workflowId}/execute`, {
        method: 'POST',
      });
      const result = await res.json();
      if (result.success) {
        alert('Workflow started successfully');
        window.location.reload();
      } else {
        alert(result.error || 'Failed to execute workflow');
      }
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setExecuting(null);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Workflows</h3>
        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors">
          + New Workflow
        </button>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="divide-y divide-gray-700">
          {workflows.map((workflow) => (
            <div
              key={workflow.id}
              className="p-4 hover:bg-blue-500/5 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium text-white">{workflow.name}</div>
                  {workflow.description && (
                    <div className="text-xs text-gray-500 mt-1">{workflow.description}</div>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-gray-400">{workflow.steps} steps</span>
                    <span className="text-xs text-gray-400">{workflow.runs_count || 0} runs</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${
                    workflow.status === 'active'
                      ? 'bg-green-500/20 text-green-400'
                      : workflow.status === 'running'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-gray-700 text-gray-400'
                  }`}>
                    {workflow.status}
                  </span>
                  <button
                    onClick={() => handleExecute(workflow.id)}
                    disabled={executing === workflow.id || workflow.status === 'running'}
                    className="px-3 py-1 text-xs font-semibold rounded bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500 hover:text-white transition-colors disabled:opacity-50"
                  >
                    {executing === workflow.id ? '...' : 'Run'}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {workflows.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No workflows created yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
