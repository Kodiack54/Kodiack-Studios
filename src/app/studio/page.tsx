'use client';

/**
 * Studio Page - Development Environment
 * Includes browser preview with project/environment selection
 * and Claude terminals for AI workers
 */

import { useState, useEffect, useContext } from 'react';
import { PageTitleContext, PageActionsContext } from '@/app/layout';
import { useDeveloper } from '@/app/contexts/DeveloperContext';
import { useUser } from '@/app/settings/UserContext';
import { DraggableSidebar, SidebarItem } from './components';
import BrowserPage from './browser/BrowserPage';
import ClaudeTerminal from './terminal/ClaudeTerminal';
import { Plug, PlugZap } from 'lucide-react';
import type { Project, Environment } from '@/types';
import { ENVIRONMENTS } from '@/types';

// Sidebar items - same as dev-studio-5000
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
  const { selectedTeam, connectionStatus, connect, disconnect } = useDeveloper();
  const { user } = useUser();
  const [activePanel, setActivePanel] = useState<string | null>('browser');

  // Project and environment state
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedEnv, setSelectedEnv] = useState<Environment>(ENVIRONMENTS[0]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  // Fetch projects on mount
  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch('/api/projects');
        const data = await res.json();
        if (data.success && data.projects) {
          setProjects(data.projects);
          // Auto-select first project
          if (data.projects.length > 0) {
            setSelectedProject(data.projects[0]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      } finally {
        setIsLoadingProjects(false);
      }
    }
    fetchProjects();
  }, []);

  useEffect(() => {
    setPageTitle({
      title: 'Studio',
      description: 'Development environment with Claude AI'
    });

    // Add project/environment selectors as page actions
    setPageActions(
      <div className="flex items-center gap-2">
        {/* Project Dropdown */}
        <select
          value={selectedProject?.id || ''}
          onChange={(e) => {
            const project = projects.find(p => p.id === e.target.value);
            setSelectedProject(project || null);
          }}
          className="w-44 bg-gray-800/80 text-white text-sm px-3 py-1.5 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-white/30"
          disabled={isLoadingProjects}
        >
          {isLoadingProjects ? (
            <option>Loading...</option>
          ) : projects.length === 0 ? (
            <option>No projects</option>
          ) : (
            projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))
          )}
        </select>

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
      </div>
    );

    return () => {
      setPageTitle({ title: '', description: '' });
      setPageActions(null);
    };
  }, [setPageTitle, setPageActions, projects, selectedProject, selectedEnv, isLoadingProjects]);

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
              project={selectedProject}
              env={selectedEnv}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
              {activePanel ? `${activePanel} panel - coming soon` : 'Select a panel from the sidebar'}
            </div>
          )}
        </div>

        {/* Right: Claude Terminal area */}
        <div className="w-[400px] bg-gray-850 flex flex-col flex-shrink-0">
          {/* Blue header bar with Connect button */}
          <div className="h-10 flex items-center justify-between px-3" style={{ background: 'linear-gradient(to right, #3B82F6, #06B6D4)' }}>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">AI Workers</span>
              <span className="text-xs text-white/70">({selectedTeam.portRange})</span>
            </div>

            {/* Connect/Disconnect Button */}
            {connectionStatus === 'connected' ? (
              <button
                onClick={disconnect}
                className="flex items-center gap-2 px-3 py-1 bg-green-500/30 text-white border border-white/30 rounded-lg hover:bg-green-500/40 transition-colors"
              >
                <PlugZap className="w-4 h-4" />
                <span className="text-sm font-medium">Connected</span>
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              </button>
            ) : connectionStatus === 'connecting' ? (
              <button
                disabled
                className="flex items-center gap-2 px-3 py-1 bg-yellow-500/30 text-white border border-white/30 rounded-lg cursor-wait"
              >
                <Plug className="w-4 h-4 animate-pulse" />
                <span className="text-sm font-medium">Connecting...</span>
              </button>
            ) : (
              <button
                onClick={() => user?.id && connect(user.id)}
                disabled={!user?.id}
                className="flex items-center gap-2 px-3 py-1 bg-gray-800 text-white border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <Plug className="w-4 h-4" />
                <span className="text-sm font-medium">Connect</span>
              </button>
            )}
          </div>

          {/* Terminal content */}
          {connectionStatus === 'connected' ? (
            <div className="flex-1 min-h-0 flex flex-col">
              <ClaudeTerminal
                port={selectedTeam.basePort}
                projectPath={selectedProject?.server_path || '/var/www/NextBid_Dev/dev-studio-5000'}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-900">
              <div className="text-center px-6">
                <div className="text-4xl mb-4">🔌</div>
                <h3 className="text-white font-medium mb-2">Not Connected</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Click <span className="text-cyan-400 font-medium">Connect</span> above to start your AI worker session.
                </p>
                <p className="text-gray-500 text-xs">
                  {selectedTeam.label} ({selectedTeam.portRange})
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
