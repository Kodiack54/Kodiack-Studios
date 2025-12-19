'use client';

import { ReactNode } from 'react';
import { useUser, UserRole, Permissions } from './UserContext';

interface RoleGateProps {
  children: ReactNode;
  minRole?: UserRole;
  permission?: keyof Permissions;
  fallback?: ReactNode;
}

// Show content only if user has minimum role or permission
export function RoleGate({ children, minRole, permission, fallback = null }: RoleGateProps) {
  const { hasMinRole, hasPermission, isLoading } = useUser();

  if (isLoading) {
    return null;
  }

  // Check permission if specified
  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>;
  }

  // Check minimum role if specified
  if (minRole && !hasMinRole(minRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Disable buttons/interactions if user doesn't have permission
interface PermissionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  permission?: keyof Permissions;
  minRole?: UserRole;
  children: ReactNode;
}

export function PermissionButton({ permission, minRole, children, className, ...props }: PermissionButtonProps) {
  const { hasMinRole, hasPermission, isLoading } = useUser();

  const hasAccess = !isLoading && (
    (!permission || hasPermission(permission)) &&
    (!minRole || hasMinRole(minRole))
  );

  if (!hasAccess) {
    return (
      <button
        {...props}
        disabled
        className={`${className} opacity-50 cursor-not-allowed`}
        title="You don't have permission to perform this action"
      >
        {children}
      </button>
    );
  }

  return (
    <button {...props} className={className}>
      {children}
    </button>
  );
}

// Show access denied message
interface AccessDeniedProps {
  message?: string;
  requiredRole?: UserRole;
}

export function AccessDenied({ message, requiredRole }: AccessDeniedProps) {
  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center">
      <div className="text-4xl mb-4">🔒</div>
      <h3 className="text-xl font-semibold text-white mb-2">Access Denied</h3>
      <p className="text-gray-400">
        {message || `You need ${requiredRole || 'higher'} access to view this content.`}
      </p>
    </div>
  );
}

// Show role badge
interface RoleBadgeProps {
  role: UserRole;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const colors: Record<UserRole, string> = {
    superadmin: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    admin: 'bg-red-500/20 text-red-400 border-red-500/30',
    lead: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    engineer: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    developer: 'bg-green-500/20 text-green-400 border-green-500/30',
    support: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded border ${colors[role]}`}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
}
