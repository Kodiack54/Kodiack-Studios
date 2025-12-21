'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus, ArrowLeft, ChevronRight, ChevronDown, Settings, Server, GitBranch } from 'lucide-react';
import { Project, TabType, TABS } from './types';
import ProjectHeader from './components/ProjectHeader';
import ProjectTabs from './components/ProjectTabs';
import ProjectForm from './components/ProjectForm';

// Tab Components
import TodosTab from './tabs/TodosTab';
import DocsTab from './tabs/DocsTab';
import DatabaseTab from './tabs/DatabaseTab';
import StructureTab from './tabs/StructureTab';
import ConventionsTab from './tabs/ConventionsTab';
import NotepadTab from './tabs/NotepadTab';
import BugsTab from './tabs/BugsTab';
import KnowledgeTab from './tabs/KnowledgeTab';

// Environment color config
const ENV_COLORS = {
  dev: { bg: 'bg-blue-600/20', text: 'text-blue-400', border: 'border-blue-500', label: 'Dev' },
  test: { bg: 'bg-yellow-600/20', text: 'text-yellow-400', border: 'border-yellow-500', label: 'Test' },
  prod: { bg: 'bg-green-600/20', text: 'text-green-400', border: 'border-green-500', label: 'Prod' },
};

// Detect environment from project name/slug
function detectEnvironment(project: Project): 'dev' | 'test' | 'prod' | null {
  const name = (project.name + ' ' + project.slug).toLowerCase();
  if (name.includes('prod') || name.includes('production') || name.includes('live')) return 'prod';
  if (name.includes('test') || name.includes('staging') || name.includes('qa')) return 'test';
  if (name.includes('dev') || name.includes('development') || name.includes('local')) return 'dev';
  return null;
}

// Wrapper component to handle Suspense for useSearchParams
export default function ProjectManagementPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900 flex items-center justify-center"><div className="animate-spin text-4xl">⚙️</div></div>}>
      <ProjectManagementContent />
    </Suspense>
  );
}

function ProjectManagementContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectSlug = searchParams.get('project');

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('todos');
  const [isLoading, setIsLoading] = useState(true);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());

  // Group projects by parent
  const parentProjects = projects.filter(p => p.is_parent);
  const childProjects = projects.filter(p => !p.is_parent && p.parent_id);
  const orphanProjects = projects.filter(p => !p.is_parent && !p.parent_id);

  // Get children for a parent
  const getChildren = (parentId: string) => childProjects.filter(p => p.parent_id === parentId);

  // Toggle parent expansion
  const toggleParent = (parentId: string) => {
    setExpandedParents(prev => {
      const next = new Set(prev);
      if (next.has(parentId)) {
        next.delete(parentId);
      } else {
        next.add(parentId);
      }
      return next;
    });
  };

  // Fetch projects
  useEffect(() => {
    fetchProjects();
  }, []);

  // Handle project selection from URL
  useEffect(() => {
    if (projectSlug && projects.length > 0) {
      const project = projects.find(p => p.slug === projectSlug);
      if (project) {
        setSelectedProject(project);
      }
    } else if (!projectSlug) {
      setSelectedProject(null);
    }
  }, [projectSlug, projects]);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/project-management/api/projects');
      const data = await response.json();
      if (data.success) {
        setProjects(data.projects);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectProject = (project: Project) => {
    router.push(`/project-management?project=${project.slug}`);
  };

  const handleBackToList = () => {
    router.push('/project-management');
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setShowProjectForm(true);
  };

  const handleAddProject = () => {
    setEditingProject(null);
    setShowProjectForm(true);
  };

  const handleFormClose = () => {
    setShowProjectForm(false);
    setEditingProject(null);
  };

  const handleFormSave = () => {
    fetchProjects();
    handleFormClose();
  };

  // Move project up or down in the list
  const handleMoveProject = async (projectId: string, direction: 'up' | 'down') => {
    const currentIndex = projects.findIndex(p => p.id === projectId);
    if (currentIndex === -1) return;

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= projects.length) return;

    const currentProject = projects[currentIndex];
    const swapProject = projects[swapIndex];

    // Swap sort_order values
    try {
      await Promise.all([
        fetch('/project-management/api/projects', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: currentProject.id, sort_order: swapProject.sort_order }),
        }),
        fetch('/project-management/api/projects', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: swapProject.id, sort_order: currentProject.sort_order }),
        }),
      ]);

      // Refresh the list
      fetchProjects();
    } catch (error) {
      console.error('Error moving project:', error);
    }
  };

  const renderTabContent = () => {
    if (!selectedProject) return null;

    const projectPath = selectedProject.server_path || '';

    switch (activeTab) {
      case 'todos':
        return <TodosTab projectPath={projectPath} projectId={selectedProject.id} />;
      case 'knowledge':
        return <KnowledgeTab projectPath={projectPath} projectId={selectedProject.id} />;
      case 'docs':
        return <DocsTab projectPath={projectPath} projectId={selectedProject.id} />;
      case 'database':
        return <DatabaseTab projectPath={projectPath} projectId={selectedProject.id} />;
      case 'structure':
        return <StructureTab projectPath={projectPath} projectId={selectedProject.id} />;
      case 'conventions':
        return <ConventionsTab projectPath={projectPath} projectId={selectedProject.id} />;
      case 'notepad':
        return <NotepadTab projectPath={projectPath} />;
      case 'bugs':
        return <BugsTab projectPath={projectPath} projectId={selectedProject.id} />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⚙️</div>
          <p className="text-gray-400">Loading projects...</p>
        </div>
      </div>
    );
  }

  // Detail View - when a project is selected
  if (selectedProject) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <button
            onClick={handleBackToList}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Projects</span>
          </button>
          <ProjectHeader
            project={selectedProject}
            onEdit={() => handleEditProject(selectedProject)}
          />
        </div>

        {/* Tabs */}
        <ProjectTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Tab Content */}
        <div className="flex-1 overflow-auto p-6">
          {renderTabContent()}
        </div>

        {/* Project Form Modal */}
        {showProjectForm && (
          <ProjectForm
            project={editingProject}
            onClose={handleFormClose}
            onSave={handleFormSave}
          />
        )}
      </div>
    );
  }

  // Render a parent project row
  const renderParentRow = (project: Project) => {
    const children = getChildren(project.id);
    const isExpanded = expandedParents.has(project.id);
    const hasChildren = children.length > 0;

    return (
      <div key={project.id} className="mb-2">
        {/* Parent Row */}
        <div
          className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-blue-500 transition-colors group"
        >
          <div className="flex items-center gap-3">
            {/* Expand Arrow */}
            <button
              onClick={() => hasChildren && toggleParent(project.id)}
              className={`p-1 rounded transition-colors ${hasChildren ? 'hover:bg-gray-700 text-gray-400 hover:text-white' : 'text-gray-700 cursor-default'}`}
            >
              {isExpanded ? (
                <ChevronDown className="w-5 h-5" />
              ) : (
                <ChevronRight className="w-5 h-5" />
              )}
            </button>

            {/* Logo/Avatar */}
            {project.logo_url ? (
              <img src={project.logo_url} alt={project.name} className="w-10 h-10 rounded-lg object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center text-purple-400 text-lg font-bold">
                {project.name.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Name & Info */}
            <div
              className="flex-1 cursor-pointer"
              onClick={() => handleSelectProject(project)}
            >
              <div className="flex items-center gap-2">
                <h3 className="text-white font-semibold">{project.name}</h3>
                <span className="px-2 py-0.5 bg-purple-600/20 text-purple-400 rounded text-xs">Parent</span>
                {hasChildren && (
                  <span className="text-gray-500 text-xs">({children.length} projects)</span>
                )}
              </div>
              <span className="text-gray-500 text-xs">{project.slug}</span>
            </div>

            {/* Ports */}
            <div className="flex items-center gap-2">
              {project.port_dev && (
                <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded text-xs">Dev:{project.port_dev}</span>
              )}
              {project.port_test && (
                <span className="px-2 py-0.5 bg-yellow-600/20 text-yellow-400 rounded text-xs">Test:{project.port_test}</span>
              )}
              {project.port_prod && (
                <span className="px-2 py-0.5 bg-green-600/20 text-green-400 rounded text-xs">Prod:{project.port_prod}</span>
              )}
            </div>

            {/* Edit Button */}
            <button
              onClick={(e) => { e.stopPropagation(); handleEditProject(project); }}
              className="p-2 text-gray-500 hover:text-white hover:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-all"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Children (when expanded) */}
        {isExpanded && children.length > 0 && (
          <div className="ml-8 mt-1 space-y-1 border-l-2 border-gray-700 pl-4">
            {children.map(child => {
              const env = detectEnvironment(child);
              const envColor = env ? ENV_COLORS[env] : null;

              return (
                <div
                  key={child.id}
                  onClick={() => handleSelectProject(child)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors group
                    ${envColor ? `${envColor.bg} border ${envColor.border}` : 'bg-gray-800 border border-gray-700'}
                    hover:brightness-110`}
                >
                  {/* Environment Badge */}
                  {envColor && (
                    <span className={`px-2 py-1 rounded text-xs font-medium ${envColor.text} ${envColor.bg}`}>
                      {envColor.label}
                    </span>
                  )}

                  {/* Name */}
                  <span className={`font-medium ${envColor ? envColor.text : 'text-white'}`}>
                    {child.name}
                  </span>

                  {/* Port */}
                  {(child.port_dev || child.port_test || child.port_prod) && (
                    <span className="text-gray-500 text-xs ml-auto">
                      :{child.port_dev || child.port_test || child.port_prod}
                    </span>
                  )}

                  {/* Edit */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEditProject(child); }}
                    className="p-1 text-gray-500 hover:text-white hover:bg-gray-600 rounded opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Settings className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Render orphan project (no parent)
  const renderOrphanRow = (project: Project) => {
    const env = detectEnvironment(project);
    const envColor = env ? ENV_COLORS[env] : null;

    return (
      <div
        key={project.id}
        onClick={() => handleSelectProject(project)}
        className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-blue-500 transition-colors cursor-pointer group mb-2"
      >
        <div className="flex items-center gap-3">
          {/* Spacer for alignment */}
          <div className="w-7" />

          {/* Logo */}
          {project.logo_url ? (
            <img src={project.logo_url} alt={project.name} className="w-10 h-10 rounded-lg object-cover" />
          ) : (
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold
              ${envColor ? `${envColor.bg} ${envColor.text}` : 'bg-blue-600/20 text-blue-400'}`}>
              {project.name.charAt(0).toUpperCase()}
            </div>
          )}

          {/* Name */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-white font-semibold">{project.name}</h3>
              {envColor && (
                <span className={`px-2 py-0.5 rounded text-xs ${envColor.bg} ${envColor.text}`}>
                  {envColor.label}
                </span>
              )}
            </div>
            <span className="text-gray-500 text-xs">{project.slug}</span>
          </div>

          {/* Ports */}
          <div className="flex items-center gap-2">
            {project.port_dev && (
              <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded text-xs">Dev:{project.port_dev}</span>
            )}
            {project.port_test && (
              <span className="px-2 py-0.5 bg-yellow-600/20 text-yellow-400 rounded text-xs">Test:{project.port_test}</span>
            )}
            {project.port_prod && (
              <span className="px-2 py-0.5 bg-green-600/20 text-green-400 rounded text-xs">Prod:{project.port_prod}</span>
            )}
          </div>

          {/* Edit */}
          <button
            onClick={(e) => { e.stopPropagation(); handleEditProject(project); }}
            className="p-2 text-gray-500 hover:text-white hover:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-all"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  // List View - all projects
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Project Management</h1>
            <p className="text-gray-400 text-sm mt-1">
              {parentProjects.length} parent{parentProjects.length !== 1 ? 's' : ''} · {childProjects.length + orphanProjects.length} project{(childProjects.length + orphanProjects.length) !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={handleAddProject}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Project
          </button>
        </div>
      </div>

      {/* Project List */}
      <div className="p-6 max-w-5xl mx-auto">
        {projects.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📁</div>
            <h3 className="text-xl font-semibold text-white mb-2">No Projects Yet</h3>
            <p className="text-gray-400 mb-4">Create your first project to get started</p>
            <button
              onClick={handleAddProject}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Add Project
            </button>
          </div>
        ) : (
          <div>
            {/* Parent Projects with Children */}
            {parentProjects.map(parent => renderParentRow(parent))}

            {/* Orphan Projects (no parent) */}
            {orphanProjects.length > 0 && parentProjects.length > 0 && (
              <div className="mt-6 mb-3">
                <h3 className="text-gray-500 text-sm font-medium px-2">Standalone Projects</h3>
              </div>
            )}
            {orphanProjects.map(project => renderOrphanRow(project))}
          </div>
        )}
      </div>

      {/* Project Form Modal */}
      {showProjectForm && (
        <ProjectForm
          project={editingProject}
          onClose={handleFormClose}
          onSave={handleFormSave}
        />
      )}
    </div>
  );
}
