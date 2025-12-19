'use client';

import { useState } from 'react';

interface Task {
  id: string;
  title: string;
  description?: string;
  type: string;
  priority: string;
  status: string;
  assignee?: string;
  xp_reward?: number;
  created_at?: string;
  due_at?: string;
}

interface TaskType {
  id: string;
  name: string;
  color: string;
}

interface TasksListProps {
  tasks: Task[];
  taskTypes: TaskType[];
}

export default function TasksList({ tasks, taskTypes }: TasksListProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [search, setSearch] = useState('');

  const filteredTasks = tasks.filter((t) => {
    if (filter !== 'all' && t.status !== filter) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const priorityColors: Record<string, string> = {
    low: 'bg-gray-500/20 text-gray-400',
    normal: 'bg-blue-500/20 text-blue-400',
    high: 'bg-yellow-500/20 text-yellow-400',
    critical: 'bg-red-500/20 text-red-400',
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    in_progress: 'bg-blue-500/20 text-blue-400',
    completed: 'bg-green-500/20 text-green-400',
    cancelled: 'bg-gray-500/20 text-gray-400',
  };

  const handleComplete = async (taskId: string) => {
    try {
      const res = await fetch(`/api/nexttask/tasks/${taskId}/complete`, { method: 'POST' });
      const result = await res.json();
      if (result.success) {
        window.location.reload();
      } else {
        alert(result.error || 'Failed to complete task');
      }
    } catch (e) {
      alert((e as Error).message);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Tasks</h3>
        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors">
          + Create Task
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex gap-2">
          {(['all', 'pending', 'in_progress', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
              }`}
            >
              {f.replace('_', ' ').charAt(0).toUpperCase() + f.replace('_', ' ').slice(1)}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Tasks */}
      <div className="space-y-3">
        {filteredTasks.map((task) => (
          <div
            key={task.id}
            className="bg-gray-800 border border-gray-700 rounded-xl p-4 hover:bg-blue-500/5 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-white">{task.title}</span>
                  {task.xp_reward && (
                    <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">
                      +{task.xp_reward} XP
                    </span>
                  )}
                </div>
                {task.description && (
                  <div className="text-xs text-gray-500 mb-2">{task.description}</div>
                )}
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${priorityColors[task.priority] || priorityColors.normal}`}>
                    {task.priority}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded ${statusColors[task.status] || statusColors.pending}`}>
                    {task.status.replace('_', ' ')}
                  </span>
                  <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                    {task.type}
                  </span>
                  {task.assignee && (
                    <span className="text-xs text-gray-500">
                      Assigned to: {task.assignee}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {task.status !== 'completed' && (
                  <button
                    onClick={() => handleComplete(task.id)}
                    className="px-3 py-1 text-xs font-semibold rounded bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500 hover:text-white transition-colors"
                  >
                    Complete
                  </button>
                )}
                <button className="px-3 py-1 text-xs font-semibold rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500 hover:text-white transition-colors">
                  View
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredTasks.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No tasks found
          </div>
        )}
      </div>
    </div>
  );
}
