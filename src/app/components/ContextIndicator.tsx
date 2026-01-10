'use client';

/**
 * ContextIndicator - Project dropdown + mode indicator in header
 *
 * Context Contract v1.0:
 * - Project dropdown sets stickyProject (persists across tabs)
 * - Mode is auto-derived from route (shown as pill)
 * - System tabs show "System mode" indicator
 */

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { ChevronDown, Check } from 'lucide-react';
import { useUserContext } from '@/app/contexts/UserContextProvider';

interface Project {
  id: string;
  slug: string;
  name: string;
}

export default function ContextIndicator() {
  const {
    context,
    hasActiveContext,
    isLoading,
    stickyProject,
    effectiveProject,
    resolvedMode,
    isSystemTab,
    setStickyProject,
  } = useUserContext();

  const [isOpen, setIsOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const isForgeRoute = pathname?.startsWith('/the-forge') || pathname?.startsWith('/forge');

  // Fetch projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      setLoadingProjects(true);
      try {
        const res = await fetch('/api/projects?parents_only=true');
        const data = await res.json();
        if (data.success && data.projects) {
          setProjects(data.projects);
        }
      } catch (err) {
        console.error('Failed to fetch projects:', err);
      } finally {
        setLoadingProjects(false);
      }
    };
    fetchProjects();
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectProject = (project: Project) => {
    setStickyProject({
      id: project.id,
      slug: project.slug,
      name: project.name,
    });
    setIsOpen(false);
  };


  // Display name for current selection (show stickyProject, not effectiveProject)
  // On system tabs, effectiveProject is forced to Studios Platform, but we show stickyProject
  const displayName = isForgeRoute ? 'The Forge' : (stickyProject?.name || 'Studios Platform');

  if (isLoading) {
    return (
      <div className="w-56 h-10 flex items-center gap-2 px-3 bg-gray-700 rounded-xl text-sm border border-gray-600 text-gray-400">
        <div className="w-4 h-4 rounded-full bg-gray-600 animate-pulse flex-shrink-0" />
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className="relative">
      {/* Main button - fixed width, mode-colored ring (no ring for default/studio) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`h-10 w-64 flex items-center justify-between gap-2 px-3 rounded-xl text-sm border-2 transition-colors bg-blue-500/20 text-white hover:bg-blue-500/30 ${
          resolvedMode === 'project' ? 'border-blue-500/60' :
          resolvedMode === 'support' ? 'border-green-500/60' :
          resolvedMode === 'forge' ? 'border-orange-500/60' :
          resolvedMode === 'planning' ? 'border-purple-500/60' :
          'border-transparent'
        }`}
      >
        {/* Project name */}
        <span className="font-medium truncate">{displayName}</span>

        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-12 right-0 w-64 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="px-3 py-2 border-b border-gray-700 bg-gray-800/50">
            <span className="text-xs text-gray-400 uppercase tracking-wider">Select Project</span>
          </div>

          {/* Project list */}
          <div className="max-h-64 overflow-y-auto">
            {loadingProjects ? (
              <div className="px-3 py-4 text-center text-gray-400 text-sm">Loading projects...</div>
            ) : projects.length === 0 ? (
              <div className="px-3 py-4 text-center text-gray-400 text-sm">No projects found</div>
            ) : (
              <>

                {/* Projects */}
                {projects.filter(p => isForgeRoute ? p.slug === 'the-forge' : p.slug !== 'the-forge').map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleSelectProject(project)}
                    className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-700 transition-colors ${
                      stickyProject?.id === project.id ? 'bg-gray-700/50' : ''
                    }`}
                  >
                    <span className="text-white truncate">{project.name}</span>
                    {stickyProject?.id === project.id && (
                      <Check className="w-4 h-4 text-blue-400 ml-auto flex-shrink-0" />
                    )}
                  </button>
                ))}
              </>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
