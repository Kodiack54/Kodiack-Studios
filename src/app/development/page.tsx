'use client';

import { useEffect } from 'react';
import { useUser, useMinRole } from '../settings/UserContext';

// Dev Studio redirect - uses API route to pass token to Dev Droplet auth
const DEV_REDIRECT_URL = '/api/dev-redirect';

export default function DevelopmentRedirectPage() {
  const { user, isLoading } = useUser();
  const hasAccess = useMinRole('engineer');

  useEffect(() => {
    if (!isLoading && user && hasAccess) {
      // Open dev studio via API redirect (handles token passing)
      window.open(DEV_REDIRECT_URL, '_blank');
    }
  }, [isLoading, user, hasAccess]);

  // Access check
  if (!isLoading && !hasAccess) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="bg-gray-800 border border-red-500/50 rounded-xl p-8 text-center max-w-md">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-semibold text-white mb-2">Access Restricted</h2>
          <p className="text-gray-400">Engineer+ access required for Dev Studio.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-[calc(100vh-200px)]">
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center max-w-md">
        <div className="text-5xl mb-4">🛠️</div>
        <h2 className="text-xl font-semibold text-white mb-2">Dev Studio</h2>
        <p className="text-gray-400 mb-6">
          The Dev Studio runs on the Development Droplet for AI-assisted coding sessions.
        </p>

        <div className="space-y-3">
          <a
            href={DEV_REDIRECT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Open Dev Studio
          </a>

          <p className="text-xs text-gray-500">
            Dev Droplet · Claude AI · Session Tracking · Project Management
          </p>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-700">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Quick Links</h3>
          <div className="grid grid-cols-2 gap-2">
            <a
              href="/dev-controls/releases"
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg"
            >
              Push / Pull
            </a>
            <a
              href="/dev-controls/deploy"
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg"
            >
              Deploy
            </a>
            <a
              href="/servers/tradelines"
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg"
            >
              Servers
            </a>
            <a
              href="/credentials"
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg"
            >
              Credentials
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
