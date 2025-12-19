import { NextResponse } from 'next/server';
import { ROLE_PERMISSIONS, Permissions } from '@/app/settings/UserContext';

// Permission descriptions for the UI
const PERMISSION_DESCRIPTIONS: Record<keyof Permissions, string> = {
  level: 'Role hierarchy level',
  canViewDashboards: 'View dashboard pages and data',
  canRebootServers: 'Reboot tradeline servers',
  canManageCredentials: 'View and manage API credentials',
  canUseKillSwitches: 'Use emergency kill switches',
  canPushToTest: 'Deploy code to test environment',
  canPushToProd: 'Deploy code to production',
  canEditSourceCode: 'Edit source code files',
  canApproveProdDeploys: 'Approve production deployments',
  canManageUsersRoles: 'Manage team member accounts and roles',
  canRotateSecrets: 'Rotate API secrets and credentials',
  canAccessHelpdesk: 'Access help desk tickets',
  hasAllProjects: 'Access all projects regardless of assignment',
};

// Permission groups for organizing in the UI
const PERMISSION_GROUPS: Record<string, (keyof Permissions)[]> = {
  'Dashboard Access': ['canViewDashboards', 'hasAllProjects'],
  'Server Operations': ['canRebootServers', 'canUseKillSwitches'],
  'Deployment': ['canPushToTest', 'canPushToProd', 'canApproveProdDeploys'],
  'Development': ['canEditSourceCode'],
  'Credentials': ['canManageCredentials', 'canRotateSecrets'],
  'Administration': ['canManageUsersRoles', 'canAccessHelpdesk'],
};

export async function GET() {
  // Get all unique permission keys from ROLE_PERMISSIONS
  const superadminPerms = ROLE_PERMISSIONS.superadmin;
  const permissionKeys = Object.keys(superadminPerms).filter(
    (key) => key !== 'level'
  ) as (keyof Permissions)[];

  const permissions = permissionKeys.map((key) => ({
    id: key,
    name: key
      .replace(/^can/, '')
      .replace(/^has/, '')
      .replace(/([A-Z])/g, ' $1')
      .trim(),
    description: PERMISSION_DESCRIPTIONS[key] || '',
    group: Object.entries(PERMISSION_GROUPS).find(([_, perms]) =>
      perms.includes(key)
    )?.[0] || 'Other',
  }));

  return NextResponse.json(permissions);
}
