'use client';

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  user_name: string;
  xp: number;
  level: number;
  tasks_completed: number;
}

interface LeaderboardPanelProps {
  leaderboard: LeaderboardEntry[];
}

export default function LeaderboardPanel({ leaderboard }: LeaderboardPanelProps) {
  const getRankBadge = (rank: number) => {
    if (rank === 1) return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: '🥇' };
    if (rank === 2) return { bg: 'bg-gray-400/20', text: 'text-gray-300', icon: '🥈' };
    if (rank === 3) return { bg: 'bg-orange-500/20', text: 'text-orange-400', icon: '🥉' };
    return { bg: 'bg-gray-700', text: 'text-gray-400', icon: `#${rank}` };
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
      <h3 className="text-lg font-semibold text-white mb-4">Leaderboard</h3>

      <div className="space-y-3">
        {leaderboard.map((entry) => {
          const badge = getRankBadge(entry.rank);

          return (
            <div
              key={entry.user_id}
              className={`p-3 rounded-lg ${entry.rank <= 3 ? badge.bg : 'bg-gray-900'} border border-gray-700`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${badge.bg} ${badge.text}`}>
                  {entry.rank <= 3 ? badge.icon : entry.rank}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-white">{entry.user_name}</div>
                  <div className="text-xs text-gray-500">
                    Level {entry.level} · {entry.tasks_completed} tasks
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-purple-400">{entry.xp.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">XP</div>
                </div>
              </div>
            </div>
          );
        })}

        {leaderboard.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            No leaderboard data
          </div>
        )}
      </div>

      {/* XP Legend */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="text-xs text-gray-500 mb-2">XP Rewards</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400">Easy task</span>
            <span className="text-purple-400">+10 XP</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Medium task</span>
            <span className="text-purple-400">+25 XP</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Hard task</span>
            <span className="text-purple-400">+50 XP</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Epic task</span>
            <span className="text-purple-400">+100 XP</span>
          </div>
        </div>
      </div>
    </div>
  );
}
