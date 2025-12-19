import { getHealth, getStatus, getTasks, getTaskTypes, getLeaderboard } from './api';
import ServerStatus from './components/ServerStatus';
import TasksList from './components/TasksList';
import LeaderboardPanel from './components/LeaderboardPanel';
import Link from 'next/link';

export default async function NextTaskPage() {
  let health: any = null;
  let status: any = null;
  let tasks: any[] = [];
  let taskTypes: any[] = [];
  let leaderboard: any[] = [];
  let error: string | null = null;

  try {
    const [healthRes, statusRes, tasksRes, typesRes, leaderboardRes] = await Promise.all([
      getHealth().catch(() => null),
      getStatus().catch(() => null),
      getTasks().catch(() => ({ tasks: [] })),
      getTaskTypes().catch(() => ({ types: [] })),
      getLeaderboard().catch(() => ({ leaderboard: [] }))
    ]);

    health = healthRes;
    status = statusRes;
    tasks = (tasksRes as any).tasks || [];
    taskTypes = (typesRes as any).types || [];
    leaderboard = (leaderboardRes as any).leaderboard || [];
  } catch (e) {
    error = (e as Error).message;
  }

  const pendingTasks = tasks.filter((t: any) => t.status === 'pending');
  const completedTasks = tasks.filter((t: any) => t.status === 'completed');
  const inProgressTasks = tasks.filter((t: any) => t.status === 'in_progress');

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-700">
        <div>
          <h2 className="text-2xl font-semibold text-white">NextTask</h2>
          <p className="text-gray-400 text-sm">7106 - MMO Style Never Ending Task Generator</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/servers/nexttask/credentials"
            className="px-4 py-2 bg-purple-500/15 text-purple-400 border border-purple-500/30 rounded-lg text-sm font-semibold hover:bg-purple-500 hover:text-white transition-colors"
          >
            Credentials
          </Link>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-500/15 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Server Status */}
      <ServerStatus health={health} status={status} />

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <div className="text-3xl font-semibold text-white mb-1">{tasks.length}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">Total Tasks</div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <div className="text-3xl font-semibold text-yellow-400 mb-1">{pendingTasks.length}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">Pending</div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <div className="text-3xl font-semibold text-blue-400 mb-1">{inProgressTasks.length}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">In Progress</div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <div className="text-3xl font-semibold text-green-400 mb-1">{completedTasks.length}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">Completed</div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <div className="text-3xl font-semibold text-purple-400 mb-1">{taskTypes.length}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">Task Types</div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-3 gap-6">
        {/* Tasks List - 2 columns */}
        <div className="col-span-2">
          <TasksList tasks={tasks} taskTypes={taskTypes} />
        </div>

        {/* Leaderboard - 1 column */}
        <div>
          <LeaderboardPanel leaderboard={leaderboard} />
        </div>
      </div>
    </div>
  );
}
