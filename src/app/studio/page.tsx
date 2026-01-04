'use client';

/**
 * Studio Page - Development Environment
 * Includes browser preview with project/environment selection
 * and Claude terminals for AI team
 */

import { useState, useEffect, useContext } from 'react';
import { PageTitleContext, PageActionsContext } from '@/app/layout';
import { useDeveloper, DEVELOPER_TEAMS, ParentProject } from '@/app/contexts/DeveloperContext';
import { useUser, useMinRole } from '@/app/settings/UserContext';
import { Lock, FolderOpen, FileText } from 'lucide-react';
import { DraggableSidebar, SidebarItem } from './components';
import { BriefingOverlay } from './components/BriefingOverlay';
import BrowserPage from './browser/BrowserPage';
import ClaudeTerminal from './terminal/ClaudeTerminal';
import { SessionHubPage } from './session-hub';
import ProjectManagementPanel from '../project-management/ProjectManagementPanel';
import { Plug, PlugZap, Monitor } from 'lucide-react';
import type { Project, Environment } from '@/types';
import { ENVIRONMENTS } from '@/types';

// Sidebar items - same as kodiack-dashboard-5500
const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'files', icon: '📁', label: 'Files' },
  { id: 'terminal', icon: '💻', label: 'Terminal' },
  { id: 'ai-usage', icon: '💰', label: 'AI Usage' },
  { id: 'browser', icon: '🌐', label: 'Browser' },
  { id: 'schema', icon: '🗄️', label: 'DB Schema' },
  { id: 'chatlog', icon: '📜', label: 'Chat Log' },
  { id: 'hub', icon: '🎯', label: 'Session Hub' },
  { id: 'storage', icon: '💾', label: 'Storage' },
  { id: 'projects', icon: '⚙️', label: 'Projects' },
  { id: 'docs', icon: '📝', label: 'Docs' },
  { id: 'health', icon: '🩺', label: 'AI Health' },
];

export default function StudioPage() {
  const setPageTitle = useContext(PageTitleContext);
  const setPageActions = useContext(PageActionsContext);
  const { selectedTeam, selectTeamById, connectionStatus, connect, disconnect, selectedProject, setSelectedProject, pcTag } = useDeveloper();
  const { user } = useUser();
  const isEngineer = useMinRole('engineer');
  const [activePanel, setActivePanel] = useState<string | null>('browser');

  // Briefing overlay state
  const [showBriefingOverlay, setShowBriefingOverlay] = useState(false);
  const [hasAutoShown, setHasAutoShown] = useState(false);

  // Parent projects for session (only top-level projects)
  const [parentProjects, setParentProjects] = useState<ParentProject[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  // Environment state (for browser preview)
  const [selectedEnv, setSelectedEnv] = useState<Environment>(ENVIRONMENTS[0]);

  // Locked teams state - shows which teams are in use by other users
  const [lockedTeams, setLockedTeams] = useState<Record<string, { userId: string; userName: string; since: string }>>({});

  // Fetch locked teams status
  useEffect(() => {
    async function fetchLockedTeams() {
      try {
        const res = await fetch('/api/dev-session/status');
        const data = await res.json();
        if (data.success && data.lockedTeams) {
          setLockedTeams(data.lockedTeams);
        }
      } catch (error) {
        console.error('Failed to fetch locked teams:', error);
      }
    }
    fetchLockedTeams();
    // Refresh every 10 seconds
    const interval = setInterval(fetchLockedTeams, 10000);
    return () => clearInterval(interval);
  }, []);

  // Fetch parent projects on mount (only top-level, no parent_id)
  useEffect(() => {
    async function fetchParentProjects() {
      try {
        const res = await fetch('/api/projects?parents_only=true');
        const data = await res.json();
        if (data.success && data.projects) {
          // Filter to only parent projects (no parent_id)
          const parents = data.projects
            .filter((p: { parent_id?: string }) => !p.parent_id)
            .map((p: { id: string; name: string; slug: string; server_path?: string }) => ({
              id: p.id,
              name: p.name,
              slug: p.slug,
              server_path: p.server_path,
            }));
          setParentProjects(parents);
        }
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      } finally {
        setIsLoadingProjects(false);
      }
    }
    fetchParentProjects();
  }, []);

  // Auto-show briefing overlay when connected (once per session)
  useEffect(() => {
    if (connectionStatus === 'connected' && !hasAutoShown) {
      setShowBriefingOverlay(true);
      setHasAutoShown(true);
    }
  }, [connectionStatus, hasAutoShown]);

  useEffect(() => {
    setPageTitle({
      title: 'Studio',
      description: 'Development environment with Claude AI'
    });

    // Only show project/environment in header when connected (locked in)
    if (connectionStatus === 'connected' && selectedProject) {
      setPageActions(
        <div className="flex items-center gap-2 w-full">
          {/* Locked Project Display */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/80 rounded-lg border border-cyan-500/50">
            <FolderOpen className="w-4 h-4 text-cyan-400" />
            <span className="text-cyan-400 text-sm font-medium">{selectedProject.name}</span>
            <Lock className="w-3 h-3 text-cyan-400/60" />
          </div>

          {/* Environment Dropdown */}
          <select
            value={selectedEnv.id}
            onChange={(e) => {
              const env = ENVIRONMENTS.find(env => env.id === e.target.value);
              if (env) setSelectedEnv(env);
            }}
            className="w-44 bg-gray-800/80 text-white text-sm px-3 py-1.5 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-white/30"
          >
            {ENVIRONMENTS.map(env => (
              <option key={env.id} value={env.id}>{env.name}</option>
            ))}
          </select>

          {/* Briefing Button - Far Right with thin black border */}
          <button
            onClick={() => setShowBriefingOverlay(true)}
            className="flex items-center gap-2 px-3 py-1.5 ml-auto bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-medium rounded-lg border border-gray-900 hover:from-blue-600 hover:to-cyan-600 transition-all shadow-md"
          >
            <FileText className="w-4 h-4" />
            Briefing
          </button>
        </div>
      );
    } else {
      setPageActions(null);
    }

    return () => {
      setPageTitle({ title: '', description: '' });
      setPageActions(null);
    };
  }, [setPageTitle, setPageActions, connectionStatus, selectedProject, selectedEnv]);

  // Show access restricted for non-engineers
  if (!isEngineer) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <Lock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Access Restricted</h2>
          <p className="text-gray-400">Engineer+ access required for the Dev Studio Environment.</p>
        </div>
      </div>
    );
  }

  // Show connection modal when not connected
  if (connectionStatus !== 'connected') {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="max-w-lg w-full mx-4">
          {/* Modal Card */}
          <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-6 text-center border-b border-gray-700" style={{ background: 'linear-gradient(to right, #3B82F6, #06B6D4)' }}>
              <Monitor className="w-12 h-12 text-white mx-auto mb-3" />
              <h2 className="text-xl font-bold text-white">Welcome to Studio</h2>
              <p className="text-white/80 text-sm mt-1">Select your dev team and connect to begin</p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Dev Team Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Select Development Team</label>
                <div className="space-y-2">
                  {DEVELOPER_TEAMS.map((team, index) => {
                    const lockInfo = lockedTeams[team.id];
                    const isLockedByOther = lockInfo && lockInfo.userId !== user?.id;
                    const isLockedByMe = lockInfo && lockInfo.userId === user?.id;

                    return (
                      <button
                        key={team.id}
                        onClick={() => !isLockedByOther && selectTeamById(team.id)}
                        disabled={isLockedByOther}
                        className={`w-full p-3 rounded-lg border text-left transition-all flex items-center justify-between ${
                          isLockedByOther
                            ? 'border-red-800/50 bg-red-900/20 cursor-not-allowed opacity-60'
                            : selectedTeam.id === team.id
                            ? 'border-cyan-500 bg-cyan-500/20'
                            : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            isLockedByOther
                              ? 'bg-red-800/50 text-red-300'
                              : selectedTeam.id === team.id
                              ? 'bg-cyan-500 text-white'
                              : 'bg-gray-600 text-gray-300'
                          }`}>
                            {isLockedByOther ? <Lock className="w-4 h-4" /> : index + 1}
                          </div>
                          <div className="flex flex-col">
                            <span className={`font-medium ${
                              isLockedByOther
                                ? 'text-red-400'
                                : selectedTeam.id === team.id
                                ? 'text-cyan-400'
                                : 'text-gray-300'
                            }`}>
                              Development Team {index + 1}
                            </span>
                            {isLockedByOther && (
                              <span className="text-xs text-red-400/70">
                                Locked by {lockInfo.userName}
                              </span>
                            )}
                          </div>
                        </div>
                        {isLockedByOther ? (
                          <span className="text-red-400 text-xs">In Use</span>
                        ) : isLockedByMe ? (
                          <span className="text-green-400 text-xs">Your Session</span>
                        ) : selectedTeam.id === team.id ? (
                          <span className="text-cyan-400 text-sm">Selected</span>
                        ) : (
                          <span className="text-green-400 text-xs">Available</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Parent Project Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Select Parent Project</label>
                <div className="relative">
                  <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    value={selectedProject?.id || ''}
                    onChange={(e) => {
                      const project = parentProjects.find(p => p.id === e.target.value);
                      setSelectedProject(project || null);
                    }}
                    disabled={isLoadingProjects}
                    className={`w-full pl-10 pr-4 py-3 rounded-lg border text-left transition-all appearance-none bg-gray-800 ${
                      selectedProject
                        ? 'border-cyan-500 text-cyan-400'
                        : 'border-gray-600 text-white'
                    } focus:outline-none focus:ring-2 focus:ring-cyan-500/50`}
                  >
                    <option value="" className="bg-gray-800 text-white">-- Select a project --</option>
                    {parentProjects.map(p => (
                      <option key={p.id} value={p.id} className="bg-gray-800 text-white">{p.name}</option>
                    ))}
                  </select>
                </div>
                {!selectedProject && (
                  <p className="text-xs text-amber-400/70 mt-1">Required: Select a project before connecting</p>
                )}
              </div>

              {/* Connect Button */}
              <button
                onClick={() => user?.id && connect(user.id)}
                disabled={!user?.id || !selectedProject || connectionStatus === 'connecting'}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {connectionStatus === 'connecting' ? (
                  <>
                    <Plug className="w-5 h-5 animate-pulse" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <PlugZap className="w-5 h-5" />
                    <span>Connect to Development Team {selectedTeam.id.replace('dev', '')}</span>
                  </>
                )}
              </button>

              {/* Info */}
              <p className="text-center text-gray-500 text-xs">
                Your session will be logged for {user?.name || 'your account'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-gray-900">
      {/* Icon Sidebar */}
      <div className="w-14 bg-gray-800 border-r border-gray-700 flex flex-col items-center py-2 flex-shrink-0">
        <DraggableSidebar
          items={SIDEBAR_ITEMS}
          activePanel={activePanel}
          onPanelChange={setActivePanel}
        />
      </div>

      {/* Main Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Browser/Panel content area */}
        <div className="flex-1 flex flex-col border-r border-gray-700">
          {activePanel === 'browser' ? (
            <BrowserPage
              project={selectedProject as Project | null}
              env={selectedEnv}
            />
          ) : activePanel === 'hub' ? (
            <SessionHubPage teamBasePort={selectedTeam.basePort} />
          ) : activePanel === 'projects' ? (
            <div className="flex-1 overflow-auto p-4">
              <ProjectManagementPanel />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
              {activePanel ? `${activePanel} panel - coming soon` : 'Select a panel from the sidebar'}
            </div>
          )}
        </div>

        {/* Right: Claude Terminal area */}
        <div className="w-[400px] bg-gray-850 flex flex-col flex-shrink-0">
          {/* Blue header bar with Disconnect button */}
          <div className="h-10 flex items-center justify-between px-3" style={{ background: 'linear-gradient(to right, #3B82F6, #06B6D4)' }}>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">AI Team</span>
              <span className="text-xs text-white/70">({selectedTeam.portRange})</span>
            </div>

            <button
              onClick={disconnect}
              className="flex items-center gap-2 px-3 py-1 bg-green-500/30 text-white border border-white/30 rounded-lg hover:bg-red-500/30 hover:border-red-400/50 transition-colors"
            >
              <PlugZap className="w-4 h-4" />
              <span className="text-sm font-medium">Connected</span>
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            </button>
          </div>

          {/* Terminal content */}
          <div className="flex-1 min-h-0 flex flex-col">
            <ClaudeTerminal
              port={selectedTeam.basePort}
              projectPath={selectedProject?.server_path || '/var/www/Studio'}
              projectId={selectedProject?.id}
              projectSlug={selectedProject?.slug}
              userId={user?.id}
              pcTag={pcTag}
              projectName={selectedProject?.name}
              devTeam={selectedTeam.id}
            />
          </div>
        </div>
      </div>

      {/* Briefing Overlay */}
      <BriefingOverlay
        isOpen={showBriefingOverlay}
        onClose={() => setShowBriefingOverlay(false)}
        projectName={selectedProject?.name || ''}
        projectId={selectedProject?.id || ''}
        projectSlug={selectedProject?.slug}
        devTeam={selectedTeam.id}
        basePort={selectedTeam.basePort}
        devSlot={selectedTeam.id.replace('dev', '')}
        pcTag={pcTag || ''}
        userName={user?.name || 'Unknown'}
      />
    </div>
  );
}
