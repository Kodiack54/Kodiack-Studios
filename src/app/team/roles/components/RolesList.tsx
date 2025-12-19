'use client';

import { useState } from 'react';

interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  level: number;
  members_count?: number;
}

interface RolesListProps {
  roles: Role[];
  permissions?: any[]; // Kept for backward compatibility but not used
}

export default function RolesList({ roles }: RolesListProps) {
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  const levelColors: Record<number, string> = {
    1: 'bg-gray-500/20 text-gray-400',
    2: 'bg-blue-500/20 text-blue-400',
    3: 'bg-purple-500/20 text-purple-400',
    4: 'bg-yellow-500/20 text-yellow-400',
    5: 'bg-orange-500/20 text-orange-400',
    6: 'bg-red-500/20 text-red-400',
  };

  // Format permission names for display
  const formatPermissionName = (permId: string) => {
    // Convert camelCase to readable format (e.g., canPushToTest -> Push To Test)
    return permId
      .replace(/^can/, '')
      .replace(/([A-Z])/g, ' $1')
      .trim();
  };

  // Sort by level descending (highest first)
  const sortedRoles = [...roles].sort((a, b) => b.level - a.level);

  return (
    <div className="space-y-4">
      {sortedRoles.map((role) => (
        <div
          key={role.id}
          className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden"
        >
          {/* Role Header */}
          <div
            className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-900/50"
            onClick={() => setExpandedRole(expandedRole === role.id ? null : role.id)}
          >
            <div className="flex items-center gap-4">
              <div className={`px-3 py-1 rounded text-xs font-bold ${levelColors[role.level] || levelColors[1]}`}>
                Level {role.level}
              </div>
              <div>
                <div className="font-medium text-white">{role.name}</div>
                {role.description && (
                  <div className="text-xs text-gray-500">{role.description}</div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-xs text-gray-500">
                {role.members_count || 0} members · {role.permissions.length} permissions
              </div>
              <span className="text-gray-400">
                {expandedRole === role.id ? '▼' : '▶'}
              </span>
            </div>
          </div>

          {/* Expanded Content */}
          {expandedRole === role.id && (
            <div className="border-t border-gray-700 p-4 bg-gray-900/50">
              <div className="mb-4">
                <div className="text-sm font-medium text-gray-400 mb-2">Permissions</div>
                <div className="flex flex-wrap gap-2">
                  {role.permissions.map((permId) => (
                    <span
                      key={permId}
                      className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded"
                    >
                      {formatPermissionName(permId)}
                    </span>
                  ))}
                  {role.permissions.length === 0 && (
                    <span className="text-xs text-gray-500">No permissions assigned</span>
                  )}
                </div>
              </div>

              <div className="text-xs text-gray-500 italic">
                System-defined role. Permissions cannot be modified.
              </div>
            </div>
          )}
        </div>
      ))}

      {roles.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No roles defined. Create a role to get started.
        </div>
      )}
    </div>
  );
}
