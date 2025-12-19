'use client';

import { useState } from 'react';
import Link from 'next/link';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive' | 'pending';
  last_active?: string;
  projects?: string[];
  created_at?: string;
}

interface Role {
  id: string;
  name: string;
  level: number;
  description: string;
}

interface MembersTableProps {
  members: TeamMember[];
  roles: Role[];
}

export default function MembersTable({ members, roles }: MembersTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const filteredMembers = members.filter((member) => {
    if (statusFilter !== 'all' && member.status !== statusFilter) return false;
    if (roleFilter !== 'all' && member.role.toLowerCase() !== roleFilter.toLowerCase()) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      if (
        !member.name.toLowerCase().includes(searchLower) &&
        !member.email.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }
    return true;
  });

  const statusColors: Record<string, string> = {
    active: 'bg-green-500/20 text-green-400',
    inactive: 'bg-gray-500/20 text-gray-400',
    pending: 'bg-yellow-500/20 text-yellow-400',
  };

  const getRoleName = (roleId: string) => {
    const role = roles.find((r) => r.id === roleId.toLowerCase());
    return role?.name || roleId.charAt(0).toUpperCase() + roleId.slice(1);
  };

  return (
    <div>
      {/* Filters */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
          </select>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Roles</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results */}
      <div className="text-sm text-gray-400 mb-4">
        Showing {filteredMembers.length} of {members.length} members
      </div>

      {/* Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-900">
            <tr>
              <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Member</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Role</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Status</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Projects</th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {filteredMembers.map((member) => (
              <tr key={member.id} className="hover:bg-gray-900/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-white">{member.name}</div>
                      <div className="text-xs text-gray-500">{member.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-purple-400">{getRoleName(member.role)}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded ${statusColors[member.status]}`}>
                    {member.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="text-xs text-gray-400">
                    {member.projects?.length || 0} projects
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/team/members/${member.id}`}
                    className="px-3 py-1 text-xs font-semibold rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500 hover:text-white transition-colors"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredMembers.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No members found
          </div>
        )}
      </div>
    </div>
  );
}
