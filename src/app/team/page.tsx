import Link from 'next/link';
import { getTeamMembers, getRoles, getTeamStats } from './api';
import TeamStats from './components/TeamStats';
import TeamMembersList from './components/TeamMembersList';

export default async function TeamPage() {
  let members: any[] = [];
  let roles: any[] = [];
  let stats: any = null;
  let error: string | null = null;

  try {
    [members, roles, stats] = await Promise.all([
      getTeamMembers().catch(() => []),
      getRoles().catch(() => []),
      getTeamStats().catch(() => null),
    ]);
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-700">
        <div>
          <h2 className="text-2xl font-semibold text-white">Team Management</h2>
          <p className="text-gray-400 text-sm">
            Manage team members, roles, and permissions
          </p>
        </div>
        <Link
          href="/team/members/new"
          className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors"
        >
          + Add Team Member
        </Link>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-500/15 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Stats */}
      <TeamStats stats={stats} />

      {/* Quick Navigation */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Link
          href="/team/members"
          className="bg-gray-800 border border-gray-700 rounded-xl p-4 hover:bg-blue-500/10 hover:border-blue-500/30 transition-colors"
        >
          <div className="text-2xl mb-2">👥</div>
          <div className="font-medium text-white">Members</div>
          <div className="text-xs text-gray-500">{members.length} team members</div>
        </Link>

        <Link
          href="/team/roles"
          className="bg-gray-800 border border-gray-700 rounded-xl p-4 hover:bg-purple-500/10 hover:border-purple-500/30 transition-colors"
        >
          <div className="text-2xl mb-2">🎭</div>
          <div className="font-medium text-white">Roles</div>
          <div className="text-xs text-gray-500">{roles.length} roles defined</div>
        </Link>

        <Link
          href="/team/permissions"
          className="bg-gray-800 border border-gray-700 rounded-xl p-4 hover:bg-green-500/10 hover:border-green-500/30 transition-colors"
        >
          <div className="text-2xl mb-2">🔐</div>
          <div className="font-medium text-white">Permissions</div>
          <div className="text-xs text-gray-500">Access control</div>
        </Link>

        <Link
          href="/team/reports"
          className="bg-gray-800 border border-gray-700 rounded-xl p-4 hover:bg-yellow-500/10 hover:border-yellow-500/30 transition-colors"
        >
          <div className="text-2xl mb-2">📊</div>
          <div className="font-medium text-white">Reports</div>
          <div className="text-xs text-gray-500">Activity & productivity</div>
        </Link>
      </div>

      {/* Team Members List */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Team Members</h3>
          <Link href="/team/members" className="text-sm text-blue-400 hover:text-blue-300">
            View All →
          </Link>
        </div>
        <TeamMembersList members={members.slice(0, 5)} roles={roles} compact />
      </div>
    </div>
  );
}
