'use client';

import Link from 'next/link';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive' | 'pending';
  avatar_url?: string;
  last_active?: string;
  projects?: string[];
}

interface Role {
  id: string;
  name: string;
  level: number;
}

interface TeamMembersListProps {
  members: TeamMember[];
  roles: Role[];
  compact?: boolean;
}

export default function TeamMembersList({ members, roles, compact = false }: TeamMembersListProps) {
  const statusColors: Record<string, string> = {
    active: 'bg-green-500/20 text-green-400',
    inactive: 'bg-gray-500/20 text-gray-400',
    pending: 'bg-yellow-500/20 text-yellow-400',
  };

  const getRoleName = (roleId: string) => {
    const role = roles.find((r) => r.id === roleId.toLowerCase());
    return role?.name || roleId.charAt(0).toUpperCase() + roleId.slice(1);
  };

  const getTimeSince = (dateStr?: string) => {
    if (!dateStr) return 'Never';

    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 5) return 'Online';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (members.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No team members found
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {members.map((member) => (
        <Link
          key={member.id}
          href={`/team/members/${member.id}`}
          className={`flex items-center gap-4 bg-gray-900 border border-gray-700 rounded-lg ${compact ? 'p-3' : 'p-4'} hover:bg-blue-500/5 hover:border-blue-500/30 transition-colors`}
        >
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
            {member.avatar_url ? (
              <img src={member.avatar_url} alt={member.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              member.name.charAt(0).toUpperCase()
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-white">{member.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${statusColors[member.status]}`}>
                {member.status}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              {member.email}
            </div>
          </div>

          {/* Role */}
          <div className="text-right">
            <div className="text-sm text-purple-400">{getRoleName(member.role)}</div>
            {!compact && (
              <div className="text-xs text-gray-600">
                {getTimeSince(member.last_active)}
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
