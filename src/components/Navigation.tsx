'use client';

import { useState, useContext, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, DoorOpen, ArrowLeft } from 'lucide-react';
import TimeClockDropdown from './TimeClockDropdown';
import SettingsDropdown from './SettingsDropdown';
import ChatDropdown from './ChatDropdown';
import AITeamChat from '@/app/ai-team/components/AITeamChat';
import ContextIndicator from '@/app/components/ContextIndicator';
import { ProductionStatusContext } from '@/app/layout';
import { supabase } from '../lib/supabase';

interface NavigationProps {
  pageTitle?: { title: string; description: string };
  pageActions?: ReactNode;
}

export default function Navigation({ pageTitle, pageActions }: NavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { showServers, toggleServers } = useContext(ProductionStatusContext);

  // Tab navigation - exactly like MyKeystone style
  // Tabs: Servers / Operations / Dev Tools / HelpDesk / Calendar / Development
  const tabs = [
    { id: 'servers', label: 'Servers', path: '/servers/tradelines' },
    { id: 'operations', label: 'Operations', path: '/operations' },
    { id: 'dev-tools', label: 'Dev Tools', path: '/dev-controls' },
    { id: 'helpdesk', label: 'HelpDesk', path: '/helpdesk' },
    { id: 'calendar', label: 'Calendar', path: '/calendar' },
    { id: 'studio', label: 'Studio', path: '/studio' },
  ];

  const getActiveTab = () => {
    if (pathname?.startsWith('/operations')) return 'operations';
    if (pathname?.startsWith('/dev-controls')) return 'dev-tools';
    if (pathname?.startsWith('/project-management')) return 'projects';
    if (pathname?.startsWith('/studio')) return 'studio';
    if (pathname?.startsWith('/team')) return 'studio';
    if (pathname?.startsWith('/calendar')) return 'calendar';
    return '';
  };

  const activeTab = getActiveTab();
  const isCredentialsPage = pathname?.startsWith('/credentials');

  // Credentials sub-tabs
  const credentialTabs = [
    { key: 'overview', label: 'Overview', path: '/credentials' },
    { key: 'federal', label: 'Federal', path: '/credentials/federal' },
    { key: 'state', label: 'State', path: '/credentials/state' },
    { key: 'local', label: 'Local', path: '/credentials/local' },
    { key: 'municipal', label: 'Municipal', path: '/credentials/municipal' },
    { key: 'other', label: 'Other', path: '/credentials/other' },
  ];

  const getActiveCredentialTab = () => {
    if (pathname === '/credentials') return 'overview';
    const match = credentialTabs.find(t => t.path !== '/credentials' && pathname?.startsWith(t.path));
    return match?.key || 'overview';
  };

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  return (
    <div className="sticky top-0 z-50">
      {/* Main Navigation Bar - bg-gray-800 like MyKeystone */}
      <nav className="bg-gray-800 shadow-lg">
        <div className="px-6">
          <div className="flex items-center justify-between">
            {/* Left: Title + Tabs */}
            <div className="flex items-end space-x-4">
              {/* Title - links to Dashboard */}
              <Link href="/dashboard" className="flex items-center py-3 hover:opacity-80 transition-opacity">
                <div>
                  <div className="text-white font-bold text-xl leading-tight">Kodiack Studio</div>
                  <div className="text-gray-400 text-xs leading-tight">Games. Platforms. Systems.</div>
                </div>
              </Link>

              {/* Tab Navigation - aligned to bottom */}
              <div className="hidden md:flex items-end space-x-1 pb-0">
                {tabs.map(tab => {
                  const isActive = activeTab === tab.id;
                  const isExternal = 'external' in tab && tab.external;
                  const tabClass = `w-32 py-1.5 rounded-t-xl text-base font-medium transition-all border-t border-x flex items-center justify-center ${
                    isActive
                      ? 'bg-blue-600 text-white border-blue-500 shadow-lg'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white border-gray-600'
                  }`;

                  if (isExternal) {
                    return (
                      <a
                        key={tab.id}
                        href={tab.path}
                        className={tabClass}
                      >
                        {tab.label}
                      </a>
                    );
                  }

                  return (
                    <Link
                      key={tab.id}
                      href={tab.path}
                      className={tabClass}
                    >
                      {tab.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Right: Context Indicator, Time Clock, Settings, Logout */}
            <div className="flex items-center space-x-2">
              {/* Context Indicator - shows current mode/project (replaces Client dropdown) */}
              <ContextIndicator />

              {/* Team Chat - Slack-like messaging for devs */}
              <ChatDropdown />

              {/* AI Team Chat - Chat with AI workers */}
              <AITeamChat />

              {/* Time Clock - EXACT MyKeystone style: w-10 h-10 rounded-xl */}
              <TimeClockDropdown />

              {/* Settings - EXACT MyKeystone style: w-10 h-10 bg-gray-700 rounded-xl */}
              <SettingsDropdown />

              {/* Logout - EXACT MyKeystone style: w-10 h-10 bg-blue-600 rounded-xl */}
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition-colors"
                title="Logout"
              >
                <DoorOpen className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Gradient Banner Bar - like MyKeystone */}
      <div className="shadow-md" style={{ background: 'linear-gradient(to right, #3B82F6, #06B6D4)' }}>
        <div className="px-6 py-1">
          <div className="flex items-center">
            {/* Back button + Page title + Page actions */}
            <div className="flex-1 flex items-center space-x-3">
              {/* Back Button */}
              <button
                onClick={() => window.history.back()}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0 text-white border border-black/30 hover:bg-white/10"
                title="Go Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {/* Page Title & Description */}
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-white leading-tight">
                  {pageTitle?.title || (
                    <>
                      {activeTab === '' && 'Dashboard'}
                      {activeTab === 'operations' && 'Operations'}
                      {activeTab === 'dev-tools' && 'Development Tools'}
                      {activeTab === 'projects' && 'Project Management'}
                      {activeTab === 'studio' && 'Development Environment'}
                      {activeTab === 'calendar' && 'Team Schedule'}
                    </>
                  )}
                </h1>
                {pageTitle?.description && (
                  <p className="text-white/80 text-xs mt-0.5 leading-tight">{pageTitle.description}</p>
                )}
              </div>

              {/* Page Actions (fills remaining space) */}
              {pageActions && (
                <div className="flex-1 flex items-center space-x-2">
                  {pageActions}
                </div>
              )}

              {/* Spacer to push credentials tabs right (only if no pageActions) */}
              {!pageActions && <div className="flex-1" />}
            </div>

            {/* Right: Credentials Tabs (only on /credentials pages) */}
            {isCredentialsPage && (
              <div className="flex items-center gap-1 ml-4">
                {credentialTabs.map((tab) => {
                  const isActive = getActiveCredentialTab() === tab.key;
                  return (
                    <Link
                      key={tab.key}
                      href={tab.path}
                      className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </Link>
                  );
                })}
              </div>
            )}

            </div>
        </div>
      </div>

      {/* Logout Confirmation Modal - EXACT MyKeystone style */}
      {showLogoutConfirm && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowLogoutConfirm(false)} />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl z-50 p-6 w-96">
            <h3 className="text-xl font-bold text-gray-900 mb-3">Confirm Logout</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to log out?</p>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
