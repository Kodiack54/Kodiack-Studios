'use client';

import { useState, useContext, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, DoorOpen, Monitor, Users, Wrench, LayoutGrid, Zap, ArrowLeft, Server } from 'lucide-react';
import TimeClockDropdown from './TimeClockDropdown';
import SettingsDropdown from './SettingsDropdown';
import ChatDropdown from './ChatDropdown';
import { ProductionStatusContext } from '@/app/layout';
import { supabase } from '../lib/supabase';

// Project definitions for the switcher
const projects = [
  { id: 'dev-command', name: 'Dev Command Center', icon: Monitor, color: 'text-blue-400' },
  { id: 'nextbid-portal', name: 'NextBid Portal', icon: Users, color: 'text-green-400' },
  { id: 'nextbidder', name: 'NextBidder', icon: LayoutGrid, color: 'text-purple-400' },
  { id: 'nextsource', name: 'NextSource', icon: Wrench, color: 'text-orange-400' },
  { id: 'nexttech', name: 'NextTech', icon: Zap, color: 'text-pink-400' },
];

interface NavigationProps {
  pageTitle?: { title: string; description: string };
  pageActions?: ReactNode;
}

export default function Navigation({ pageTitle, pageActions }: NavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [selectedProject, setSelectedProject] = useState(projects[0]);
  const { showServers, toggleServers } = useContext(ProductionStatusContext);

  // Tab navigation - exactly like MyKeystone style
  // Tabs: Servers / Dev Tools / HelpDesk / Calendar / Development
  const tabs = [
    { id: 'servers', label: 'Servers', path: '/servers/tradelines' },
    { id: 'dev-tools', label: 'Dev Tools', path: '/dev-controls' },
    { id: 'helpdesk', label: 'HelpDesk', path: '/helpdesk' },
    { id: 'calendar', label: 'Calendar', path: '/calendar' },
    { id: 'development', label: 'Development', path: '/development' },
  ];

  const getActiveTab = () => {
    if (pathname?.startsWith('/servers')) return 'servers';
    if (pathname?.startsWith('/credentials')) return 'servers'; // Credentials is under servers tab
    if (pathname?.startsWith('/dev-controls')) return 'dev-tools';
    if (pathname?.startsWith('/helpdesk')) return 'helpdesk';
    if (pathname?.startsWith('/calendar')) return 'calendar';
    if (pathname?.startsWith('/development')) return 'development';
    if (pathname?.startsWith('/team')) return 'development'; // Redirect old team to development
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

  function handleProjectChange(projectId: string) {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setSelectedProject(project);
      // Navigate to external URLs for other projects
      if (projectId === 'dev-command') {
        router.push('/dashboard');
      } else if (projectId === 'nextbid-portal') {
        window.open('http://146.190.169.112:8004', '_blank');
      } else if (projectId === 'nextbidder') {
        window.open('http://146.190.169.112:8001', '_blank');
      } else if (projectId === 'nextsource') {
        window.open('http://146.190.169.112:8003', '_blank');
      } else if (projectId === 'nexttech') {
        window.open('http://146.190.169.112:8002', '_blank');
      }
    }
  }

  return (
    <div className="sticky top-0 z-50">
      {/* Main Navigation Bar - bg-gray-800 like MyKeystone */}
      <nav className="bg-gray-800 shadow-lg">
        <div className="px-6">
          <div className="flex items-center justify-between">
            {/* Left: Logo + Tabs */}
            <div className="flex items-end space-x-4">
              {/* Logo - links to Dashboard (Universal Dashboard) */}
              <Link href="/dashboard" className="flex items-center space-x-3 py-1 hover:opacity-80 transition-opacity">
                <img
                  src="/images/nextbid-logo.png"
                  alt="NextBid"
                  className="h-[70px] w-auto rounded border-2 border-white/50"
                />
                <div>
                  <div className="text-white font-bold text-xl leading-tight">Dev Command</div>
                  <div className="text-gray-400 text-xs leading-tight">NextBid Control Center</div>
                </div>
              </Link>

              {/* Tab Navigation - aligned to bottom */}
              <div className="hidden md:flex items-end space-x-1 ml-4 pb-0">
                {tabs.map(tab => {
                  const isActive = activeTab === tab.id;
                  return (
                    <Link
                      key={tab.id}
                      href={tab.path}
                      className={`w-32 py-1.5 rounded-t-xl text-base font-medium transition-all border-t border-x flex items-center justify-center ${
                        isActive
                          ? 'bg-blue-600 text-white border-blue-500 shadow-lg'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white border-gray-600'
                      }`}
                    >
                      {tab.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Right: Project Selector, Time Clock, Settings, Logout */}
            <div className="flex items-center space-x-2">
              {/* Project Selector - EXACT same style as MyKeystone company selector */}
              <div className="relative">
                <select
                  value={selectedProject.id}
                  onChange={(e) => handleProjectChange(e.target.value)}
                  className="appearance-none bg-gray-700 text-white pl-10 pr-10 py-2 rounded-xl border border-gray-600 focus:ring-2 focus:ring-blue-500 cursor-pointer hover:bg-gray-600"
                >
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
                <Monitor className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              {/* Team Chat - Slack-like messaging for devs */}
              <ChatDropdown />

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
            {/* Left: Production Status Toggle (fixed width like DirectoryDropdown) */}
            <div className="w-52 flex items-center justify-start">
              <button
                onClick={toggleServers}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/20 hover:bg-black/30 border border-black/30 transition-colors"
              >
                <Server className="w-4 h-4 text-white" />
                <span className="text-white text-sm font-medium">Production Status</span>
                {showServers ? (
                  <ChevronDown className="w-4 h-4 text-white/70" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-white/70" />
                )}
              </button>
            </div>

            {/* Center: Back button + Page title + Page actions */}
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
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-white leading-tight">
                  {pageTitle?.title || (
                    <>
                      {activeTab === '' && 'Dashboard'}
                      {activeTab === 'servers' && !isCredentialsPage && 'Server Management'}
                      {isCredentialsPage && 'Credentials & Sources'}
                      {activeTab === 'dev-tools' && 'Development Tools'}
                      {activeTab === 'helpdesk' && 'Support Center'}
                      {activeTab === 'calendar' && 'Team Schedule'}
                      {activeTab === 'development' && 'Development Environment'}
                    </>
                  )}
                </h1>
                {pageTitle?.description && (
                  <p className="text-white/80 text-xs mt-0.5 leading-tight">{pageTitle.description}</p>
                )}
              </div>

              {/* Page Actions (right side) */}
              {pageActions && (
                <div className="flex items-center space-x-2">
                  {pageActions}
                </div>
              )}
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
