'use client';

import { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { User, Users, Calendar, CalendarCheck, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import ServerStatusIndicator, { ProjectStatus, SlotStatus } from './ServerStatusIndicator';
import ServerDetailPanel from './ServerDetailPanel';
import { ProductionStatusContext } from '@/app/layout';

// Mock current user - TODO: Get from auth context
const currentUser = {
  id: 'user-1',
  name: 'Michael',
  role: 'admin', // 'admin' | 'lead' | 'developer' | 'engineer'
  teams: ['dev-team', 'frontend-team'] // Teams this user belongs to
};

// Mock teams data - TODO: Load from dev_teams table
const allTeams = [
  { id: 'dev-team', name: 'Dev Team', color: '#10B981', memberCount: 5 },
  { id: 'frontend-team', name: 'Frontend', color: '#3B82F6', memberCount: 3 },
  { id: 'backend-team', name: 'Backend', color: '#8B5CF6', memberCount: 4 },
  { id: 'support-team', name: 'Support', color: '#F59E0B', memberCount: 2 },
];

// Mock team members - TODO: Load from dev_team_members table
const allMembers = [
  { id: '1', name: 'Michael', role: 'Lead Developer', color: '#3B82F6', teams: ['dev-team', 'frontend-team'] },
  { id: '2', name: 'Sarah', role: 'Frontend Dev', color: '#EC4899', teams: ['frontend-team'] },
  { id: '3', name: 'John', role: 'Backend Dev', color: '#10B981', teams: ['backend-team', 'dev-team'] },
  { id: '4', name: 'Emily', role: 'Full Stack', color: '#8B5CF6', teams: ['dev-team'] },
  { id: '5', name: 'Alex', role: 'Support Lead', color: '#F59E0B', teams: ['support-team'] },
  { id: '6', name: 'Chris', role: 'DevOps', color: '#06B6D4', teams: ['backend-team'] },
  { id: '7', name: 'Taylor', role: 'QA Engineer', color: '#EF4444', teams: ['dev-team'] },
  { id: '8', name: 'Jordan', role: 'UI Designer', color: '#F472B6', teams: ['frontend-team'] },
  { id: '9', name: 'Casey', role: 'Junior Dev', color: '#84CC16', teams: ['dev-team', 'frontend-team'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isCalendarPage = pathname?.startsWith('/calendar');
  const isDevToolsPage = pathname?.startsWith('/dev-controls');
  const calendarMode = searchParams?.get('mode') || 'my';
  const selectedMemberId = searchParams?.get('member');
  const selectedTeamId = searchParams?.get('team');

  // Collapsible states - showServers comes from shared context (toggled via navbar)
  const { showServers, setShowServers } = useContext(ProductionStatusContext);
  const [showOverview, setShowOverview] = useState(true);
  const [expandedTeams, setExpandedTeams] = useState<string[]>([]);

  // Server detail panel state
  const [selectedProject, setSelectedProject] = useState<ProjectStatus | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SlotStatus | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);

  // Auto-collapse servers on calendar page, auto-expand on other pages
  useEffect(() => {
    setShowServers(!isCalendarPage);
  }, [isCalendarPage]);

  // Close detail panel when servers section is collapsed
  useEffect(() => {
    if (!showServers) {
      handleCloseDetailPanel();
    }
  }, [showServers]);

  // Check if user is admin/lead (can see all calendars)
  const isAdminOrLead = currentUser.role === 'admin' || currentUser.role === 'lead';

  // Filter teams based on role
  const visibleTeams = isAdminOrLead
    ? allTeams
    : allTeams.filter(team => currentUser.teams.includes(team.id));

  // Filter members based on role and selected team
  const getVisibleMembers = (teamId?: string) => {
    if (isAdminOrLead) {
      return teamId
        ? allMembers.filter(m => m.teams.includes(teamId))
        : allMembers;
    }
    // Regular users only see members from their teams
    return allMembers.filter(m =>
      m.teams.some(t => currentUser.teams.includes(t)) &&
      (!teamId || m.teams.includes(teamId))
    );
  };

  const toggleTeam = (teamId: string) => {
    setExpandedTeams(prev =>
      prev.includes(teamId)
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const handleSelectProject = (project: ProjectStatus) => {
    setSelectedProject(project);
    setSelectedSlot(null);
    setShowDetailPanel(true);
  };

  const handleSelectSlot = (project: ProjectStatus, slot: SlotStatus) => {
    setSelectedProject(project);
    setSelectedSlot(slot);
    setShowDetailPanel(true);
  };

  const handleCloseDetailPanel = () => {
    setShowDetailPanel(false);
    setSelectedProject(null);
    setSelectedSlot(null);
  };

  const handleReboot = async (target: 'all' | 'main' | number) => {
    if (!selectedProject) return;

    try {
      const response = await fetch('/api/servers/reboot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject.id,
          slotId: selectedSlot?.slotId,
          tradeline: selectedSlot?.tradeline,
          target,
        }),
      });

      const data = await response.json();
      if (data.success) {
        console.log('Reboot initiated:', data.message);
      } else {
        console.error('Reboot failed:', data.error);
        alert(`Reboot failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Reboot request failed:', error);
      alert('Reboot request failed - check console');
    }
  };

  const handleServerAction = async (action: 'start' | 'restart' | 'stop', port: string) => {
    try {
      const endpoint = `/api/patcher/server/${action}/${port}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      if (data.success) {
        console.log(`${action} initiated for port ${port}:`, data.message);
      } else {
        console.error(`${action} failed:`, data.error);
        alert(`${action} failed: ${data.error}`);
      }
    } catch (error) {
      console.error(`${action} request failed:`, error);
      alert(`${action} request failed - check console`);
    }
  };

  return (
    <>
      <aside className="w-64 bg-gray-900/50 border-r border-gray-700 flex flex-col h-full overflow-hidden">
        {/* Production Servers Section - Toggled via navbar button */}
        {showServers && (
          <div className="flex-shrink-0 px-2 py-4 border-b border-gray-700">
            <ServerStatusIndicator
              onSelectProject={handleSelectProject}
              onSelectSlot={handleSelectSlot}
              selectedProjectId={selectedProject?.id}
              selectedSlotId={selectedSlot?.slotId}
            />
          </div>
        )}

        {/* Credentials Buttons - Below servers */}
        {showServers && (
          <div className="px-2 py-2 space-y-1">
            <Link
              href="/credentials"
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/credentials'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <span>📊</span>
              <span>Overview & Alerts</span>
            </Link>
            <Link
              href="/credentials/federal"
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname?.startsWith('/credentials/')
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <span>🔑</span>
              <span>Credentials</span>
            </Link>
          </div>
        )}

        {/* Calendar Section - Scrollable independently */}
        {isCalendarPage && (
          <div className="border-t border-gray-700 flex-1 overflow-y-auto min-h-0">
            {/* Collapsible Today's Overview */}
            <div className="bg-gray-800/50 border-b border-gray-700">
              <button
                onClick={() => setShowOverview(!showOverview)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
              >
                <h3 className="text-xs font-semibold text-gray-400 uppercase">Today's Overview</h3>
                {showOverview ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
              </button>

              {showOverview && (
                <div className="px-4 pb-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-blue-500/10 rounded-lg p-3 border-l-4 border-blue-500">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold text-blue-400">0</p>
                          <p className="text-xs text-gray-400">Events</p>
                        </div>
                        <CalendarCheck className="w-5 h-5 text-blue-500" />
                      </div>
                    </div>

                    <div className="bg-purple-500/10 rounded-lg p-3 border-l-4 border-purple-500">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold text-purple-400">0</p>
                          <p className="text-xs text-gray-400">Meetings</p>
                        </div>
                        <Users className="w-5 h-5 text-purple-500" />
                      </div>
                    </div>

                    <div className="bg-orange-500/10 rounded-lg p-3 border-l-4 border-orange-500">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold text-orange-400">0</p>
                          <p className="text-xs text-gray-400">Tasks</p>
                        </div>
                        <AlertCircle className="w-5 h-5 text-orange-500" />
                      </div>
                    </div>

                    <div className="bg-green-500/10 rounded-lg p-3 border-l-4 border-green-500">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold text-green-400">0</p>
                          <p className="text-xs text-gray-400">Time Off</p>
                        </div>
                        <Calendar className="w-5 h-5 text-green-500" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* My Calendar */}
            <div className="border-b border-gray-700">
              <Link
                href="/calendar?mode=my"
                className={`w-full flex items-center justify-between px-4 py-3 transition-all ${
                  calendarMode === 'my'
                    ? 'bg-purple-500/10 border-l-4 border-purple-500'
                    : 'hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    calendarMode === 'my' ? 'bg-purple-500' : 'bg-gray-700'
                  }`}>
                    <User className={`w-5 h-5 ${calendarMode === 'my' ? 'text-white' : 'text-gray-400'}`} />
                  </div>
                  <div className="text-left">
                    <p className={`font-semibold ${calendarMode === 'my' ? 'text-purple-400' : 'text-gray-300'}`}>My Calendar</p>
                    <p className="text-xs text-gray-500">Personal tasks & meetings</p>
                  </div>
                </div>
                {calendarMode === 'my' && (
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                )}
              </Link>
            </div>

            {/* Team Calendars */}
            <div className="border-b border-gray-700">
              <Link
                href="/calendar?mode=team"
                className={`w-full flex items-center justify-between px-4 py-3 transition-all ${
                  calendarMode === 'team' && !selectedTeamId && !selectedMemberId
                    ? 'bg-blue-500/10 border-l-4 border-blue-500'
                    : 'hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    calendarMode === 'team' ? 'bg-blue-500' : 'bg-gray-700'
                  }`}>
                    <Users className={`w-5 h-5 ${calendarMode === 'team' ? 'text-white' : 'text-gray-400'}`} />
                  </div>
                  <div className="text-left">
                    <p className={`font-semibold ${calendarMode === 'team' ? 'text-blue-400' : 'text-gray-300'}`}>Team Calendars</p>
                    <p className="text-xs text-gray-500">
                      {isAdminOrLead ? 'All team schedules' : 'Your team schedules'}
                    </p>
                  </div>
                </div>
                {calendarMode === 'team' && !selectedTeamId && !selectedMemberId && (
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                )}
              </Link>
            </div>

            {/* Teams & Members List - Only shown when team mode is selected */}
            {calendarMode === 'team' && (
              <div className="bg-blue-500/5">
                {/* Teams Section */}
                <div className="px-4 py-3">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                    Teams ({visibleTeams.length})
                  </h4>
                  <div className="space-y-1">
                    {visibleTeams.map((team) => (
                      <div key={team.id}>
                        <button
                          onClick={() => toggleTeam(team.id)}
                          className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                            selectedTeamId === team.id
                              ? 'bg-blue-600/20 border-l-2 border-blue-500'
                              : 'bg-gray-800/50 hover:bg-gray-800'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                              style={{ backgroundColor: team.color }}
                            >
                              {team.name.charAt(0)}
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-medium text-white">{team.name}</p>
                              <p className="text-xs text-gray-500">{team.memberCount} members</p>
                            </div>
                          </div>
                          {expandedTeams.includes(team.id) ? (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                          )}
                        </button>

                        {/* Team Members (expanded) */}
                        {expandedTeams.includes(team.id) && (
                          <div className="ml-4 mt-1 space-y-1">
                            {getVisibleMembers(team.id).map((member) => (
                              <Link
                                key={member.id}
                                href={`/calendar?mode=team&team=${team.id}&member=${member.id}`}
                                className={`flex items-center space-x-2 p-2 rounded-lg transition-colors ${
                                  selectedMemberId === member.id
                                    ? 'bg-blue-600/30'
                                    : 'hover:bg-gray-800/50'
                                }`}
                              >
                                <div
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                  style={{ backgroundColor: member.color }}
                                >
                                  {member.name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-white truncate">{member.name}</p>
                                  <p className="text-xs text-gray-500 truncate">{member.role}</p>
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* All Individuals Section (Admin/Lead only) */}
                {isAdminOrLead && (
                  <div className="px-4 py-3 border-t border-gray-700/50">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                      All Individuals ({allMembers.length})
                    </h4>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {allMembers.map((member) => (
                        <Link
                          key={member.id}
                          href={`/calendar?mode=team&member=${member.id}`}
                          className={`flex items-center space-x-3 p-2 rounded-lg transition-colors ${
                            selectedMemberId === member.id && !selectedTeamId
                              ? 'bg-blue-600/30'
                              : 'bg-gray-800/50 hover:bg-gray-800'
                          }`}
                        >
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: member.color }}
                          >
                            {member.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{member.name}</p>
                            <p className="text-xs text-gray-500 truncate">{member.role}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Dev Tools Section - Only shown on dev-controls pages */}
        {isDevToolsPage && (
          <div className="border-t border-gray-700 p-4 flex-shrink-0 overflow-y-auto">
            <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-3 px-3">Studio Ops</h3>
            <nav className="space-y-1">
              <SidebarLink
                href="/dev-controls"
                icon="&#127968;"
                active={pathname === '/dev-controls'}
              >
                Console Home
              </SidebarLink>
              <SidebarLink
                href="/dev-controls/releases"
                icon="&#128640;"
                active={pathname === '/dev-controls/releases'}
              >
                Push / Pull
              </SidebarLink>
              <SidebarLink
                href="/dev-controls/analytics"
                icon="&#128202;"
                active={pathname?.startsWith('/dev-controls/analytics')}
              >
                Analytics
              </SidebarLink>
              <SidebarLink
                href="/dev-controls/security"
                icon="&#128274;"
                active={pathname?.startsWith('/dev-controls/security')}
              >
                Security
              </SidebarLink>
            </nav>
            <h3 className="text-xs uppercase tracking-wider text-gray-500 mt-4 mb-3 px-3">Tools</h3>
            <nav className="space-y-1">
              <SidebarLink
                href="/dev-controls/deploy"
                icon="&#128640;"
                active={pathname === '/dev-controls/deploy'}
              >
                Deploy
              </SidebarLink>
              <SidebarLink
                href="/dev-controls/git"
                icon="&#128230;"
                active={pathname === '/dev-controls/git'}
              >
                Git
              </SidebarLink>
              <SidebarLink
                href="/dev-controls/ssh"
                icon="&#128187;"
                active={pathname === '/dev-controls/ssh'}
              >
                Terminal
              </SidebarLink>
              <SidebarLink
                href="/dev-controls/logs"
                icon="&#128203;"
                active={pathname === '/dev-controls/logs'}
              >
                Logs
              </SidebarLink>
            </nav>
          </div>
        )}
      </aside>

      {/* Server Detail Panel - Slides in from right */}
      {showDetailPanel && selectedProject && (
        <ServerDetailPanel
          project={selectedProject}
          slot={selectedSlot || undefined}
          onClose={handleCloseDetailPanel}
          onReboot={handleReboot}
          onServerAction={handleServerAction}
        />
      )}
    </>
  );
}

// Tradeline list for credentials dropdown
const TRADELINES = [
  { name: 'security', displayName: 'Security', port: 31001 },
  { name: 'administrative', displayName: 'Administrative', port: 31002 },
  { name: 'facilities', displayName: 'Facilities', port: 31003 },
  { name: 'logistics', displayName: 'Logistics', port: 31004 },
  { name: 'electrical', displayName: 'Electrical', port: 31005 },
  { name: 'lowvoltage', displayName: 'Low Voltage', port: 31006 },
  { name: 'landscaping', displayName: 'Landscaping', port: 31007 },
  { name: 'hvac', displayName: 'HVAC', port: 31008 },
  { name: 'plumbing', displayName: 'Plumbing', port: 31009 },
  { name: 'janitorial', displayName: 'Janitorial', port: 31010 },
  { name: 'support', displayName: 'Support', port: 31011 },
  { name: 'waste', displayName: 'Waste', port: 31012 },
  { name: 'construction', displayName: 'Construction', port: 31013 },
  { name: 'roofing', displayName: 'Roofing', port: 31014 },
  { name: 'painting', displayName: 'Painting', port: 31015 },
  { name: 'flooring', displayName: 'Flooring', port: 31016 },
  { name: 'demolition', displayName: 'Demolition', port: 31017 },
  { name: 'environmental', displayName: 'Environmental', port: 31018 },
  { name: 'concrete', displayName: 'Concrete', port: 31019 },
  { name: 'fencing', displayName: 'Fencing', port: 31020 },
];

// Categories for credential sources
const CREDENTIAL_CATEGORIES = [
  { key: 'federal', label: 'Federal', icon: '🏛️', path: '/credentials/federal' },
  { key: 'state', label: 'State', icon: '🗺️', path: '/credentials/state' },
  { key: 'local', label: 'Local', icon: '🏢', path: '/credentials/local' },
  { key: 'municipal', label: 'Municipal', icon: '⚡', path: '/credentials/municipal' },
  { key: 'other', label: 'Other', icon: '📦', path: '/credentials/other' },
];

function CredentialsDropdown({ pathname }: { pathname: string | null }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTradelines, setShowTradelines] = useState(false);
  const [editingTradeline, setEditingTradeline] = useState<string | null>(null);
  const isActive = pathname?.startsWith('/credentials');
  const isOverviewActive = pathname === '/credentials';

  return (
    <div className="px-2 py-2 space-y-1">
      {/* Credential Editor Modal */}
      {editingTradeline && (
        <CredentialEditorModal
          tradeline={editingTradeline}
          onClose={() => setEditingTradeline(null)}
        />
      )}

      {/* Overview & Alerts - Standalone button */}
      <Link
        href="/credentials"
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isOverviewActive
            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            : 'text-gray-400 hover:text-white hover:bg-gray-800'
        }`}
      >
        <span>📊</span>
        <span>Overview & Alerts</span>
      </Link>

      {/* Credentials Dropdown - Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive && !isOverviewActive
            ? 'bg-gray-700 text-white'
            : 'text-gray-400 hover:text-white hover:bg-gray-800'
        }`}
      >
        <div className="flex items-center gap-2">
          <span>🔑</span>
          <span>Credentials</span>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </button>

      {/* Dropdown list */}
      {isExpanded && (
        <div className="ml-2 space-y-0.5">
          {/* Category Links */}
          {CREDENTIAL_CATEGORIES.map((cat) => (
            <Link
              key={cat.key}
              href={cat.path}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-colors ${
                pathname === cat.path
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </Link>
          ))}

          {/* Tradelines Submenu */}
          <div className="pt-1 mt-1 border-t border-gray-700/50">
            <button
              onClick={() => setShowTradelines(!showTradelines)}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded text-xs text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span>⚙️</span>
                <span>Tradeline Settings</span>
              </div>
              {showTradelines ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>

            {showTradelines && (
              <div className="ml-4 mt-1 space-y-0.5 max-h-48 overflow-y-auto">
                {TRADELINES.map((t) => (
                  <button
                    key={t.name}
                    onClick={() => setEditingTradeline(t.name)}
                    className="block w-full text-left px-3 py-1 rounded text-xs transition-colors text-gray-500 hover:text-white hover:bg-gray-800"
                  >
                    {t.displayName}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Inline Credential Editor Modal for sidebar
function CredentialEditorModal({ tradeline, onClose }: { tradeline: string; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('apis');
  const [activeApiTab, setActiveApiTab] = useState('sam_gov');
  const [showPasswords, setShowPasswords] = useState(false);
  const [credentials, setCredentials] = useState<Record<string, Record<string, string>>>({});
  const [naicsCodes, setNaicsCodes] = useState<string>('');
  const [keywords, setKeywords] = useState<string>('');

  const sections = [
    { key: 'apis', label: 'API Keys' },
    { key: 'naics', label: 'NAICS Codes' },
    { key: 'keywords', label: 'Keywords' },
  ];

  const apiTypes = [
    { key: 'sam_gov', label: 'SAM.gov', fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'Enter API key' },
    ]},
    { key: 'govwin', label: 'GovWin', fields: [
      { key: 'username', label: 'Username', type: 'text', placeholder: 'Enter username' },
      { key: 'password', label: 'Password', type: 'password', placeholder: 'Enter password' },
    ]},
    { key: 'planetbids', label: 'PlanetBids', fields: [
      { key: 'username', label: 'Username', type: 'text', placeholder: 'Enter username' },
      { key: 'password', label: 'Password', type: 'password', placeholder: 'Enter password' },
    ]},
    { key: 'bidnet', label: 'BidNet', fields: [
      { key: 'username', label: 'Username', type: 'text', placeholder: 'Enter username' },
      { key: 'password', label: 'Password', type: 'password', placeholder: 'Enter password' },
    ]},
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [credRes, configRes] = await Promise.all([
          fetch(`/api/patcher/credentials/${tradeline}`).catch(() => null),
          fetch(`/api/patcher/config/${tradeline}`).catch(() => null),
        ]);
        if (credRes?.ok) {
          const data = await credRes.json();
          if (data.credentials) setCredentials(data.credentials);
        }
        if (configRes?.ok) {
          const data = await configRes.json();
          if (data.naics) setNaicsCodes(data.naics.join('\n'));
          if (data.keywords) setKeywords(data.keywords.join('\n'));
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [tradeline]);

  const handleFieldChange = (typeKey: string, fieldKey: string, value: string) => {
    setCredentials(prev => ({
      ...prev,
      [typeKey]: { ...(prev[typeKey] || {}), [fieldKey]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/patcher/credentials/${tradeline}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentials }),
      });
      await fetch(`/api/patcher/config/${tradeline}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          naics: naicsCodes.split('\n').filter(Boolean),
          keywords: keywords.split('\n').filter(Boolean),
        }),
      });
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const activeApiType = apiTypes.find(t => t.key === activeApiTab);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-8">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-white capitalize">{tradeline} Settings</h3>
            <p className="text-xs text-gray-500">API keys, NAICS codes, and keywords</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
        </div>

        <div className="flex border-b border-gray-700 bg-gray-800/50">
          {sections.map(s => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`px-6 py-3 text-sm font-medium ${activeSection === s.key ? 'text-white bg-gray-700 border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-6">
          {loading && <div className="text-gray-400 text-center py-8">Loading...</div>}
          {error && <div className="bg-red-500/15 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-4">{error}</div>}

          {!loading && activeSection === 'apis' && (
            <div>
              <div className="flex gap-2 mb-4">
                {apiTypes.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setActiveApiTab(t.key)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg ${activeApiTab === t.key ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                <input type="checkbox" checked={showPasswords} onChange={e => setShowPasswords(e.target.checked)} className="rounded bg-gray-700" />
                Show passwords
              </label>
              {activeApiType?.fields.map(f => (
                <div key={f.key} className="mb-4">
                  <label className="block text-sm text-gray-400 mb-2">{f.label}</label>
                  <input
                    type={f.type === 'password' && !showPasswords ? 'password' : 'text'}
                    value={credentials[activeApiTab]?.[f.key] || ''}
                    onChange={e => handleFieldChange(activeApiTab, f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                  />
                </div>
              ))}
            </div>
          )}

          {!loading && activeSection === 'naics' && (
            <div>
              <p className="text-sm text-gray-400 mb-4">Enter NAICS codes, one per line.</p>
              <textarea
                value={naicsCodes}
                onChange={e => setNaicsCodes(e.target.value)}
                rows={10}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono text-sm"
                placeholder="541330&#10;238210"
              />
              <p className="text-xs text-gray-500 mt-2">{naicsCodes.split('\n').filter(Boolean).length} codes</p>
            </div>
          )}

          {!loading && activeSection === 'keywords' && (
            <div>
              <p className="text-sm text-gray-400 mb-4">Enter keywords, one per line.</p>
              <textarea
                value={keywords}
                onChange={e => setKeywords(e.target.value)}
                rows={10}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono text-sm"
                placeholder="fire alarm&#10;security system"
              />
              <p className="text-xs text-gray-500 mt-2">{keywords.split('\n').filter(Boolean).length} keywords</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-semibold bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SidebarLink({
  href,
  icon,
  count,
  description,
  active,
  children,
}: {
  href: string;
  icon: string;
  count?: number;
  description?: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
        active
          ? 'bg-blue-500/20 text-blue-400'
          : 'text-gray-400 hover:text-white hover:bg-gray-800'
      }`}
      title={description}
    >
      <span dangerouslySetInnerHTML={{ __html: icon }} />
      <span className="flex-1 truncate">{children}</span>
      {count !== undefined && (
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          active ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-400'
        }`}>
          {count}
        </span>
      )}
    </Link>
  );
}
