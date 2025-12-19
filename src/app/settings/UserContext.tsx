'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import Cookies from 'js-cookie';

// Product IDs that can be assigned to users
export type ProductId = 'tradelines' | 'sources' | 'nextbidder' | 'portals' | 'nexttech' | 'nexttask' | 'dev-environment';

// All available product IDs
export const ALL_PRODUCTS: ProductId[] = ['tradelines', 'dev-environment', 'sources', 'nextbidder', 'portals', 'nexttech', 'nexttask'];

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
    hasAllProjects: true, // Superadmin sees all projects regardless of assignment
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
    canAccessHelpdesk: true, // Primary focus
    hasAllProjects: false,
  },
} as const;

export type Permissions = typeof ROLE_PERMISSIONS[UserRole];

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  assignedProjects: ProductId[];  // Products this user has access to
  teamIds?: string[];             // Teams this user belongs to
}

interface UserContextValue {
  user: User | null;
  isLoading: boolean;
  permissions: Permissions;
  hasPermission: (permission: keyof Permissions) => boolean;
  hasMinRole: (minRole: UserRole) => boolean;
  hasProjectAccess: (projectId: ProductId) => boolean;
  setUser: (user: User | null) => void;
}

const defaultPermissions = ROLE_PERMISSIONS.developer;

const UserContext = createContext<UserContextValue>({
  user: null,
  isLoading: true,
  permissions: defaultPermissions,
  hasPermission: () => false,
  hasMinRole: () => false,
  hasProjectAccess: () => false,
  setUser: () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        // Read Gateway JWT from cookie
        const accessToken = Cookies.get('accessToken');

        if (!accessToken) {
          // Not logged in via Gateway - use mock for development
          console.log('No Gateway JWT found, using mock user');
          const mockUser: User = {
            id: 'dev-user-1',
            name: 'Dev Admin',
            email: 'admin@nextbid.com',
            role: 'superadmin',
            assignedProjects: ALL_PRODUCTS,
            teamIds: ['dev-team'],
          };
          setUser(mockUser);
          setIsLoading(false);
          return;
        }

        // Decode JWT (base64) to get payload
        // JWT format: header.payload.signature
        const parts = accessToken.split('.');
        if (parts.length !== 3) {
          console.error('Invalid JWT format');
          setIsLoading(false);
          return;
        }

        const payload = JSON.parse(atob(parts[1]));
        const { id: nextbidUserId, email, name, products, onboarding_completed } = payload;

        // Check if user has dashboard access
        if (!products || !products.includes('dashboard')) {
          console.warn('User does not have dashboard access');
          setUser(null);
          setIsLoading(false);
          return;
        }

        // Fetch dev_users record for role/permissions
        const { data: devUser, error } = await supabase
          .from('dev_users')
          .select('*')
          .eq('nextbid_user_id', nextbidUserId)
          .eq('status', 'active')
          .single();

        if (error || !devUser) {
          console.warn('No dev_users record found for:', nextbidUserId);
          // User has dashboard access in Gateway but no dev_users record yet
          // Create a minimal user with default permissions
          setUser({
            id: nextbidUserId,
            name: name || email.split('@')[0],
            email,
            role: 'developer',
            assignedProjects: [],
            teamIds: [],
          });
          setIsLoading(false);
          return;
        }

        // Map database role to UserRole type
        const roleName = (devUser.role || 'developer').toLowerCase();
        const validRoles: UserRole[] = ['superadmin', 'admin', 'lead', 'engineer', 'developer', 'support'];
        const role: UserRole = validRoles.includes(roleName as UserRole)
          ? (roleName as UserRole)
          : 'developer';

        // Parse permissions array as projects (for backward compatibility)
        const permissions = (devUser.permissions || []) as string[];
        const validProjects = permissions.filter(p =>
          ALL_PRODUCTS.includes(p as ProductId)
        ) as ProductId[];

        setUser({
          id: devUser.id,
          name: name || email.split('@')[0],
          email,
          role,
          assignedProjects: validProjects.length > 0 ? validProjects : ALL_PRODUCTS, // Default to all for now
          teamIds: [],
        });
      } catch (err) {
        console.error('Error loading user:', err);
        // Fallback to mock admin for development
        setUser({
          id: 'dev-user-1',
          name: 'Dev Admin',
          email: 'admin@nextbid.com',
          role: 'superadmin',
          assignedProjects: ALL_PRODUCTS,
          teamIds: [],
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();

    // Re-check user when window regains focus (in case token changed)
    const handleFocus = () => loadUser();
    window.addEventListener('focus', handleFocus);

    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const permissions = user ? ROLE_PERMISSIONS[user.role] : defaultPermissions;

  const hasPermission = (permission: keyof Permissions): boolean => {
    if (!user) return false;
    const value = permissions[permission];
    return typeof value === 'boolean' ? value : false;
  };

  const hasMinRole = (minRole: UserRole): boolean => {
    if (!user) return false;
    const userLevel = ROLE_PERMISSIONS[user.role].level;
    const requiredLevel = ROLE_PERMISSIONS[minRole].level;
    return userLevel >= requiredLevel;
  };

  const hasProjectAccess = (projectId: ProductId): boolean => {
    if (!user) return false;
    // Superadmin has access to all projects
    if (ROLE_PERMISSIONS[user.role].hasAllProjects) return true;
    return user.assignedProjects.includes(projectId);
  };

  return (
    <UserContext.Provider value={{ user, isLoading, permissions, hasPermission, hasMinRole, hasProjectAccess, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

// Helper hook for permission-based UI rendering
export function usePermission(permission: keyof Permissions): boolean {
  const { hasPermission } = useUser();
  return hasPermission(permission);
}

// Helper hook for role-based UI rendering
export function useMinRole(minRole: UserRole): boolean {
  const { hasMinRole } = useUser();
  return hasMinRole(minRole);
}

// Helper hook for project access UI rendering
export function useProjectAccess(projectId: ProductId): boolean {
  const { hasProjectAccess } = useUser();
  return hasProjectAccess(projectId);
}
