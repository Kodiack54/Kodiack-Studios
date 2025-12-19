'use client';

interface TeamStatsProps {
  stats: {
    total_members: number;
    active_members: number;
    total_roles: number;
    recently_active: number;
    new_this_month: number;
  } | null;
}

export default function TeamStats({ stats }: TeamStatsProps) {
  const data = stats || {
    total_members: 0,
    active_members: 0,
    total_roles: 0,
    recently_active: 0,
    new_this_month: 0,
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <div className="text-xs text-gray-500 mb-1">Total Members</div>
        <div className="text-2xl font-bold text-white">{data.total_members}</div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <div className="text-xs text-gray-500 mb-1">Active Members</div>
        <div className="text-2xl font-bold text-green-400">{data.active_members}</div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <div className="text-xs text-gray-500 mb-1">System Roles</div>
        <div className="text-2xl font-bold text-purple-400">{data.total_roles}</div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <div className="text-xs text-gray-500 mb-1">Active (24h)</div>
        <div className="text-2xl font-bold text-blue-400">{data.recently_active}</div>
      </div>
    </div>
  );
}
