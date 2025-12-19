// Role definitions - shared between client and server
// This file has NO 'use client' directive so it can be imported anywhere

// Role hierarchy (highest to lowest)
export type UserRole = 'superadmin' | 'admin' | 'lead' | 'engineer' | 'developer' | 'support';

// Permission definitions based on role
export const ROLE_PERMISSIONS = {
  superadmin: {
    level: 6,
    canViewDashboards: true,
    canRebootServers: true,
    canManageCredentials: true,
    canUseKillSwitches: true,
    canPushToTest: true,
    canPushToProd: true,
    canEditSourceCode: true,
    canApproveProdDeploys: true,
    canManageUsersRoles: true,
    canRotateSecrets: true,
    canAccessHelpdesk: true,
    hasAllProjects: true,
  },
  admin: {
    level: 5,
    canViewDashboards: true,
    canRebootServers: true,
    canManageCredentials: true,
    canUseKillSwitches: true,
    canPushToTest: true,
    canPushToProd: true,
    canEditSourceCode: true,
    canApproveProdDeploys: true,
    canManageUsersRoles: true,
    canRotateSecrets: true,
    canAccessHelpdesk: true,
    hasAllProjects: false,
  },
  lead: {
    level: 4,
    canViewDashboards: true,
    canRebootServers: true,
    canManageCredentials: true,
    canUseKillSwitches: true,
    canPushToTest: true,
    canPushToProd: true,
    canEditSourceCode: true,
    canApproveProdDeploys: true,
    canManageUsersRoles: true,
    canRotateSecrets: false,
    canAccessHelpdesk: true,
    hasAllProjects: false,
  },
  engineer: {
    level: 3,
    canViewDashboards: true,
    canRebootServers: true,
    canManageCredentials: true,
    canUseKillSwitches: true,
    canPushToTest: true,
    canPushToProd: true,
    canEditSourceCode: true,
    canApproveProdDeploys: false,
    canManageUsersRoles: false,
    canRotateSecrets: false,
    canAccessHelpdesk: true,
    hasAllProjects: false,
  },
  developer: {
    level: 2,
    canViewDashboards: true,
    canRebootServers: true,
    canManageCredentials: true,
    canUseKillSwitches: false,
    canPushToTest: false,
    canPushToProd: false,
    canEditSourceCode: false,
    canApproveProdDeploys: false,
    canManageUsersRoles: false,
    canRotateSecrets: false,
    canAccessHelpdesk: true,
    hasAllProjects: false,
  },
  support: {
    level: 1,
    canViewDashboards: true,
    canRebootServers: false,
    canManageCredentials: false,
    canUseKillSwitches: false,
    canPushToTest: false,
    canPushToProd: false,
    canEditSourceCode: false,
    canApproveProdDeploys: false,
    canManageUsersRoles: false,
    canRotateSecrets: false,
    canAccessHelpdesk: true,
    hasAllProjects: false,
  },
} as const;

export type Permissions = typeof ROLE_PERMISSIONS[UserRole];

// Role descriptions for the UI
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  superadmin: 'Full access to all projects and all permissions. Can manage all users and settings.',
  admin: 'Full permissions for assigned projects. Can manage users and approve production deploys.',
  lead: 'Full permissions for assigned projects. Can deploy and manage team members.',
  engineer: 'Can push to test environments and edit source code for assigned projects.',
  developer: 'Can reboot servers and manage credentials for assigned projects.',
  support: 'Help desk access only. Can view dashboards for assigned projects.',
};

// All valid role names
export const ALL_ROLES: UserRole[] = ['superadmin', 'admin', 'lead', 'engineer', 'developer', 'support'];
