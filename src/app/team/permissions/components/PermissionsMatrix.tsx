'use client';

interface Permission {
  id: string;
  name: string;
  description?: string;
  group: string;
}

interface PermissionGroup {
  id: string;
  name: string;
  description?: string;
}

interface PermissionsMatrixProps {
  permissions: Permission[];
  groups: PermissionGroup[];
}

export default function PermissionsMatrix({ permissions, groups }: PermissionsMatrixProps) {
  // Group permissions by group
  const permissionsByGroup: Record<string, Permission[]> = {};

  permissions.forEach((perm) => {
    const groupKey = perm.group || 'general';
    if (!permissionsByGroup[groupKey]) {
      permissionsByGroup[groupKey] = [];
    }
    permissionsByGroup[groupKey].push(perm);
  });

  const groupColors: Record<string, string> = {
    servers: 'border-blue-500/30 bg-blue-500/5',
    team: 'border-purple-500/30 bg-purple-500/5',
    helpdesk: 'border-green-500/30 bg-green-500/5',
    dev: 'border-red-500/30 bg-red-500/5',
    general: 'border-gray-500/30 bg-gray-500/5',
  };

  // If no permissions, show default structure
  const defaultGroups = [
    {
      id: 'servers',
      name: 'Server Management',
      permissions: [
        { id: 'servers.view', name: 'View Servers', description: 'View server status and logs' },
        { id: 'servers.control', name: 'Control Servers', description: 'Start, stop, restart servers' },
        { id: 'servers.credentials', name: 'Manage Credentials', description: 'View and edit server credentials' },
        { id: 'servers.deploy', name: 'Deploy', description: 'Deploy code to servers' },
      ],
    },
    {
      id: 'team',
      name: 'Team Management',
      permissions: [
        { id: 'team.view', name: 'View Team', description: 'View team members' },
        { id: 'team.manage', name: 'Manage Team', description: 'Add, edit, remove team members' },
        { id: 'team.roles', name: 'Manage Roles', description: 'Create and edit roles' },
        { id: 'team.permissions', name: 'Assign Permissions', description: 'Grant and revoke permissions' },
      ],
    },
    {
      id: 'helpdesk',
      name: 'Helpdesk',
      permissions: [
        { id: 'helpdesk.view', name: 'View Tickets', description: 'View helpdesk tickets' },
        { id: 'helpdesk.respond', name: 'Respond to Tickets', description: 'Reply to tickets' },
        { id: 'helpdesk.manage', name: 'Manage Tickets', description: 'Assign and close tickets' },
        { id: 'helpdesk.settings', name: 'Helpdesk Settings', description: 'Configure helpdesk' },
      ],
    },
    {
      id: 'dev',
      name: 'Developer Tools',
      permissions: [
        { id: 'dev.ssh', name: 'SSH Access', description: 'Connect via SSH' },
        { id: 'dev.logs', name: 'View Logs', description: 'View system logs' },
        { id: 'dev.database', name: 'Database Access', description: 'Access database tools' },
        { id: 'dev.admin', name: 'Admin Panel', description: 'Access admin features' },
      ],
    },
  ];

  const displayGroups = permissions.length > 0 ? Object.keys(permissionsByGroup) : defaultGroups.map((g) => g.id);

  return (
    <div className="space-y-6">
      {(permissions.length === 0 ? defaultGroups : displayGroups.map((groupId) => {
        const group = groups.find((g) => g.id === groupId);
        return {
          id: groupId,
          name: group?.name || groupId.charAt(0).toUpperCase() + groupId.slice(1),
          permissions: permissionsByGroup[groupId] || [],
        };
      })).map((group: any) => (
        <div
          key={group.id}
          className={`border rounded-xl overflow-hidden ${groupColors[group.id] || groupColors.general}`}
        >
          {/* Group Header */}
          <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-700">
            <h3 className="font-medium text-white">{group.name}</h3>
          </div>

          {/* Permissions */}
          <div className="divide-y divide-gray-700/50">
            {group.permissions.map((perm: any) => (
              <div
                key={perm.id}
                className="px-4 py-3 flex items-center justify-between hover:bg-gray-800/30"
              >
                <div>
                  <div className="font-medium text-white text-sm">{perm.name}</div>
                  {perm.description && (
                    <div className="text-xs text-gray-500">{perm.description}</div>
                  )}
                </div>
                <code className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">
                  {perm.id}
                </code>
              </div>
            ))}
          </div>
        </div>
      ))}

      {permissions.length === 0 && (
        <div className="text-center py-4 text-gray-500 text-sm">
          Showing default permission structure. Connect to API for actual permissions.
        </div>
      )}
    </div>
  );
}
