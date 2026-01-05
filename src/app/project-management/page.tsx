'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus, ArrowLeft, GripVertical, Building2 } from 'lucide-react';
import { useClient } from '@/app/contexts/ClientContext';
import { Project, ProjectStats, TabType, TABS } from './types';
import ProjectHeader from './components/ProjectHeader';
import ProjectTabs from './components/ProjectTabs';
import ProjectForm from './components/ProjectForm';
import KpiPanel from './components/KpiPanel';
import ProjectPreviewPanel from './components/ProjectPreviewPanel';
import { SortableParentRow, SortableOrphanRow } from './components/SortableProjectRows';
import { useProjectDragDrop } from './hooks/useProjectDragDrop';

// Drag and Drop
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

// Tab Components
import PhasesTab from './tabs/PhasesTab';
import TodosTab from './tabs/TodosTab';
import DocsTab from './tabs/DocsTab';
import DatabaseTab from './tabs/DatabaseTab';
import StructureTab from './tabs/StructureTab';
import ConventionsTab from './tabs/ConventionsTab';
import NotepadTab from './tabs/NotepadTab';
import BugsTab from './tabs/BugsTab';
import KnowledgeTab from './tabs/KnowledgeTab';

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
  const allClients = searchParams.get('allClients');
  const { clients, selectedClient, setSelectedClient } = useClient();

  // Default to "All Clients" on project management page
  // This ensures users see all projects on first load
  const [clientInitialized, setClientInitialized] = useState(false);
  useEffect(() => {
    if (!clientInitialized) {
      setSelectedClient(null);
      setClientInitialized(true);
    }
  }, [clientInitialized, setSelectedClient]);

  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('todos');
  const [isLoading, setIsLoading] = useState(true);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const [projectStats, setProjectStats] = useState<Record<string, ProjectStats>>({});
  const [previewProject, setPreviewProject] = useState<Project | null>(null);

  // Filter projects by selected client
  const projects = selectedClient
    ? allProjects.filter(p => p.client_id === selectedClient.id)
    : allProjects;

  // Group projects by parent
  const parentProjects = projects.filter(p => p.is_parent);
  const childProjects = projects.filter(p => !p.is_parent && p.parent_id);
  const orphanProjects = projects.filter(p => !p.is_parent && !p.parent_id);

  // Get children for a parent
  const getChildren = (parentId: string) => childProjects.filter(p => p.parent_id === parentId);

  // Get stats for a project
  const getProjectStats = (projectId: string): ProjectStats => {
    return projectStats[projectId] || { todos: 0, knowledge: 0, docs: 0, conventions: 0, bugs: 0 };
  };

  // Calculate total stats for header
  const getTotalStats = (): ProjectStats => {
    const total: ProjectStats = { todos: 0, knowledge: 0, docs: 0, conventions: 0, bugs: 0 };
    projects.forEach(p => {
      const s = projectStats[p.id];
      if (s) {
        total.todos += s.todos || 0;
        total.knowledge += s.knowledge || 0;
        total.docs += s.docs || 0;
        total.conventions += s.conventions || 0;
        total.bugs += s.bugs || 0;
      }
    });
    return total;
  };

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Drag and drop hook
  const {
    activeId,
    overId,
    activeProject,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  } = useProjectDragDrop({
    projects,
    parentProjects,
    childProjects,
    orphanProjects,
    onRefresh: fetchProjects,
    setExpandedParents,
  });

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

  async function fetchProjects() {
    try {
      const response = await fetch('/project-management/api/projects');
      const data = await response.json();
      if (data.success) {
        setAllProjects(data.projects);
        fetchSummaries();
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchSummaries() {
    try {
      const response = await fetch('/project-management/api/projects/summary');
      const data = await response.json();
      if (data.success && data.summaries) {
        setProjectStats(data.summaries);
      }
    } catch (error) {
      console.error('Error fetching summaries:', error);
    }
  }

  const handlePreviewProject = (project: Project) => {
    setPreviewProject(project);
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

  const renderTabContent = () => {
    if (!selectedProject) return null;

    const projectPath = selectedProject.server_path || '';
    const isParent = selectedProject.is_parent || false;
    const parentId = selectedProject.parent_id || undefined;
    const childProjectIds = isParent
      ? projects.filter(p => p.parent_id === selectedProject.id).map(p => p.id)
      : [];

    switch (activeTab) {
      case 'phases':
        return <PhasesTab projectPath={projectPath} projectId={selectedProject.id} projectName={selectedProject.name} isParent={isParent} childProjectIds={childProjectIds} />;
      case 'todos':
        return <TodosTab projectPath={projectPath} projectId={selectedProject.id} projectName={selectedProject.name} isParent={isParent} childProjectIds={childProjectIds} parentId={parentId} />;
      case 'knowledge':
        return <KnowledgeTab projectPath={projectPath} projectId={selectedProject.id} projectName={selectedProject.name} isParent={isParent} childProjectIds={childProjectIds} />;
      case 'docs':
        return <DocsTab projectPath={projectPath} projectId={selectedProject.id} projectName={selectedProject.name} isParent={isParent} childProjectIds={childProjectIds} />;
      case 'database':
        return <DatabaseTab projectPath={projectPath} projectId={selectedProject.id} projectName={selectedProject.name} isParent={isParent} childProjectIds={childProjectIds} />;
      case 'structure':
        return <StructureTab projectPath={projectPath} projectId={selectedProject.id} projectName={selectedProject.name} isParent={isParent} childProjectIds={childProjectIds} />;
      case 'conventions':
        return <ConventionsTab projectPath={projectPath} projectId={selectedProject.id} projectName={selectedProject.name} isParent={isParent} childProjectIds={childProjectIds} />;
      case 'notepad':
        return <NotepadTab projectPath={projectPath} projectId={selectedProject.id} projectName={selectedProject.name} isParent={isParent} childProjectIds={childProjectIds} />;
      case 'bugs':
        return <BugsTab projectPath={projectPath} projectId={selectedProject.id} projectName={selectedProject.name} isParent={isParent} childProjectIds={childProjectIds} />;
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
    const isParent = selectedProject.is_parent || false;
    // Filter tabs based on parentOnly flag
    const visibleTabs = TABS.filter(tab => !tab.parentOnly || isParent);

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

        {/* Tabs - filtered for parent projects */}
        <ProjectTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={visibleTabs}
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
          <div className="flex items-center gap-3">
            {/* Client Dropdown */}
            <div className="relative">
              <select
                value={selectedClient?.id || ''}
                onChange={(e) => {
                  const client = clients.find(c => c.id === e.target.value) || null;
                  setSelectedClient(client);
                }}
                className="appearance-none bg-gray-700 border border-gray-600 text-white px-4 py-2 pr-8 rounded-lg text-sm focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="">All Clients</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
              <Building2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
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

        {/* Stats Row - totals across all projects */}
        <div className="mt-4 pt-4 border-t border-gray-700">
          <KpiPanel stats={getTotalStats()} variant="full" />
        </div>
      </div>

      {/* Project List + Preview Panel */}
      <div className="flex gap-6 p-6">
        {/* Left: Project List (2/3) */}
        <div className="flex-1 max-w-3xl">
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
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <div>
                {/* Parent Projects with Children */}
                <SortableContext items={parentProjects.map(p => p.id)} strategy={verticalListSortingStrategy}>
                  {parentProjects.map(parent => (
                    <SortableParentRow
                      key={parent.id}
                      project={parent}
                      children={getChildren(parent.id)}
                      isExpanded={expandedParents.has(parent.id)}
                      overId={overId}
                      activeId={activeId}
                      allProjects={projects}
                      stats={getProjectStats(parent.id)}
                      onToggle={() => toggleParent(parent.id)}
                      onPreview={handlePreviewProject}
                      onOpen={handleSelectProject}
                      onEdit={handleEditProject}
                      getChildStats={getProjectStats}
                    />
                  ))}
                </SortableContext>

                {/* Orphan Projects (no parent) */}
                {orphanProjects.length > 0 && parentProjects.length > 0 && (
                  <div className="mt-6 mb-3">
                    <h3 className="text-gray-500 text-sm font-medium px-2">Standalone Projects</h3>
                  </div>
                )}
                <SortableContext items={orphanProjects.map(p => p.id)} strategy={verticalListSortingStrategy}>
                  {orphanProjects.map(project => (
                    <SortableOrphanRow
                      key={project.id}
                      project={project}
                      stats={getProjectStats(project.id)}
                      onPreview={handlePreviewProject}
                      onOpen={handleSelectProject}
                      onEdit={handleEditProject}
                    />
                  ))}
                </SortableContext>
              </div>

              {/* Drag Overlay */}
              <DragOverlay>
                {activeProject && (
                  <div className="bg-gray-800 border border-blue-500 rounded-lg p-4 shadow-xl opacity-90">
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-4 h-4 text-blue-400" />
                      <span className="text-white font-medium">{activeProject.name}</span>
                    </div>
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          )}
        </div>

        {/* Right: Preview Panel (1/3) */}
        <div className="w-96 flex-shrink-0">
          <ProjectPreviewPanel
            project={previewProject}
            stats={previewProject ? getProjectStats(previewProject.id) : { todos: 0, bugs: 0, knowledge: 0, docs: 0, conventions: 0 }}
            onOpenProject={handleSelectProject}
          />
        </div>
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
