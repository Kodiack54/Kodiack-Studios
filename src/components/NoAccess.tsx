'use client';

import { Lock, ShieldOff, UserX, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';

type NoAccessVariant = 'no-permission' | 'no-project' | 'not-assigned' | 'pending' | 'custom';

interface NoAccessProps {
  variant?: NoAccessVariant;
  title?: string;
  message?: string;
  showBackButton?: boolean;
  showContactAdmin?: boolean;
  icon?: 'lock' | 'shield' | 'user' | 'clock' | 'alert';
}

const VARIANTS: Record<NoAccessVariant, { title: string; message: string; icon: 'lock' | 'shield' | 'user' | 'clock' | 'alert' }> = {
  'no-permission': {
    title: "This Area Is for Authorized Users Only",
    message: "You don't have the required permissions to access this page. Contact your administrator if you believe this is an error.",
    icon: 'shield',
  },
  'no-project': {
    title: "Looks Like You Don't Have Access Yet",
    message: "This project hasn't been assigned to you. Ask your team lead to add you to this project.",
    icon: 'lock',
  },
  'not-assigned': {
    title: "Oops! Access Is Limited Here",
    message: "You're not assigned to any projects yet. Your administrator needs to assign you to projects before you can access this area.",
    icon: 'user',
  },
  'pending': {
    title: "You're Almost There — Access Required",
    message: "Your account is pending approval. Once approved, you'll be able to access this area.",
    icon: 'clock',
  },
  'custom': {
    title: "This Page Isn't Available Right Now",
    message: "Something went wrong or you may not have access to this content.",
    icon: 'alert',
  },
};

const ICONS = {
  lock: Lock,
  shield: ShieldOff,
  user: UserX,
  clock: Clock,
  alert: AlertCircle,
};

export default function NoAccess({
  variant = 'no-permission',
  title,
  message,
  showBackButton = true,
  showContactAdmin = true,
  icon,
}: NoAccessProps) {
  const config = VARIANTS[variant];
  const displayTitle = title || config.title;
  const displayMessage = message || config.message;
  const IconComponent = ICONS[icon || config.icon];

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md mx-auto px-6">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center">
            <IconComponent className="w-10 h-10 text-gray-500" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white mb-3">
          {displayTitle}
        </h1>

        {/* Message */}
        <p className="text-gray-400 mb-8 leading-relaxed">
          {displayMessage}
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {showBackButton && (
            <button
              onClick={() => window.history.back()}
              className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-white font-medium transition-colors"
            >
              Go Back
            </button>
          )}
          {showContactAdmin && (
            <Link
              href="/helpdesk/system-tickets/new"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium transition-colors"
            >
              Request Access
            </Link>
          )}
        </div>

        {/* Subtle hint */}
        <p className="mt-8 text-xs text-gray-600">
          Error code: ACCESS_DENIED
        </p>
      </div>
    </div>
  );
}

// Wrapper component for project access checks
export function RequireProject({
  projectId,
  children,
  hasAccess,
}: {
  projectId: string;
  children: React.ReactNode;
  hasAccess: boolean;
}) {
  if (!hasAccess) {
    return <NoAccess variant="no-project" />;
  }
  return <>{children}</>;
}

// Wrapper component for permission checks
export function RequirePermission({
  permission,
  children,
  hasPermission,
}: {
  permission: string;
  children: React.ReactNode;
  hasPermission: boolean;
}) {
  if (!hasPermission) {
    return <NoAccess variant="no-permission" />;
  }
  return <>{children}</>;
}
