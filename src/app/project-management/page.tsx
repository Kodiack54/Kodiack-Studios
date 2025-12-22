'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus, ArrowLeft, ChevronRight, ChevronDown, Settings, GripVertical, Building2 } from 'lucide-react';
import { useClient } from '@/app/contexts/ClientContext';
import { Project, TabType, TABS } from './types';
import ProjectHeader from './components/ProjectHeader';
import ProjectTabs from './components/ProjectTabs';
import ProjectForm from './components/ProjectForm';

// Drag and Drop
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
  const allClients = searchParams.get('allClients');
  const { selectedClient, setSelectedClient } = useClient();

  // Clear client filter when coming from Session Logs with allClients=true
  useEffect(() => {
    if (allClients === 'true' && selectedClient !== null) {
      setSelectedClient(null);
    }
  }, [allClients, selectedClient, setSelectedClient]);

  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('todos');
  const [isLoading, setIsLoading] = useState(true);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [projectStats, setProjectStats] = useState<Record<string, ProjectStats>>({});

  // Filter projects by selected client
  const projects = selectedClient
    ? allProjects.filter(p => p.client_id === selectedClient.id)
    : allProjects;

  // Stats type
  interface ProjectStats {
    sessions: { pending: number; processed: number; total: number };
    todos: { pending: number; completed: number; total: number };
    knowledge: number;
    bugs: number;
    code_changes: number;
    last_activity: string | null;
  }

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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
        setAllProjects(data.projects);
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

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over?.id as string || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);

    if (!over || active.id === over.id) return;

    const activeProject = projects.find(p => p.id === active.id);
    const overProject = projects.find(p => p.id === over.id);

    if (!activeProject || !overProject) return;

    // Case 1: Reordering parents
    if (activeProject.is_parent && overProject.is_parent) {
      const oldIndex = parentProjects.findIndex(p => p.id === active.id);
      const newIndex = parentProjects.findIndex(p => p.id === over.id);

      if (oldIndex !== newIndex) {
        const reordered = arrayMove(parentProjects, oldIndex, newIndex);
        // Update sort_order for all affected parents
        const updates = reordered.map((p, idx) =>
          fetch('/project-management/api/projects', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: p.id, sort_order: idx }),
          })
        );
        await Promise.all(updates);
        fetchProjects();
      }
      return;
    }

    // Case 2: Reordering children within same parent
    if (!activeProject.is_parent && !overProject.is_parent &&
        activeProject.parent_id === overProject.parent_id) {
      const siblings = childProjects.filter(p => p.parent_id === activeProject.parent_id);
      const oldIndex = siblings.findIndex(p => p.id === active.id);
      const newIndex = siblings.findIndex(p => p.id === over.id);

      if (oldIndex !== newIndex) {
        const reordered = arrayMove(siblings, oldIndex, newIndex);
        const updates = reordered.map((p, idx) =>
          fetch('/project-management/api/projects', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: p.id, sort_order: idx }),
          })
        );
        await Promise.all(updates);
        fetchProjects();
      }
      return;
    }

    // Case 3: Moving child to different parent (drop on parent)
    if (!activeProject.is_parent && overProject.is_parent) {
      await fetch('/project-management/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeProject.id, parent_id: overProject.id }),
      });
      // Expand the target parent to show the moved child
      setExpandedParents(prev => new Set([...prev, overProject.id]));
      fetchProjects();
      return;
    }

    // Case 4: Moving child to different parent (drop on sibling in that parent)
    if (!activeProject.is_parent && !overProject.is_parent &&
        activeProject.parent_id !== overProject.parent_id && overProject.parent_id) {
      await fetch('/project-management/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeProject.id, parent_id: overProject.parent_id }),
      });
      setExpandedParents(prev => new Set([...prev, overProject.parent_id!]));
      fetchProjects();
      return;
    }

    // Case 5: Reordering orphan projects
    if (!activeProject.is_parent && !activeProject.parent_id &&
        !overProject.is_parent && !overProject.parent_id) {
      const oldIndex = orphanProjects.findIndex(p => p.id === active.id);
      const newIndex = orphanProjects.findIndex(p => p.id === over.id);

      if (oldIndex !== newIndex) {
        const reordered = arrayMove(orphanProjects, oldIndex, newIndex);
        const updates = reordered.map((p, idx) =>
          fetch('/project-management/api/projects', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: p.id, sort_order: idx + 1000 }), // Offset to avoid conflicts
          })
        );
        await Promise.all(updates);
        fetchProjects();
      }
    }
  };

  // Get the active dragging project for overlay
  const activeProject = activeId ? projects.find(p => p.id === activeId) : null;

  const renderTabContent = () => {
    if (!selectedProject) return null;

    const projectPath = selectedProject.server_path || '';
    const isParent = selectedProject.is_parent || false;
    // Get child project IDs if this is a parent
    const childProjectIds = isParent
      ? projects.filter(p => p.parent_id === selectedProject.id).map(p => p.id)
      : [];

    switch (activeTab) {
      case 'todos':
        return <TodosTab projectPath={projectPath} projectId={selectedProject.id} isParent={isParent} childProjectIds={childProjectIds} />;
      case 'knowledge':
        return <KnowledgeTab projectPath={projectPath} projectId={selectedProject.id} isParent={isParent} childProjectIds={childProjectIds} />;
      case 'docs':
        return <DocsTab projectPath={projectPath} projectId={selectedProject.id} isParent={isParent} childProjectIds={childProjectIds} />;
      case 'database':
        return <DatabaseTab projectPath={projectPath} projectId={selectedProject.id} isParent={isParent} childProjectIds={childProjectIds} />;
      case 'structure':
        return <StructureTab projectPath={projectPath} projectId={selectedProject.id} isParent={isParent} childProjectIds={childProjectIds} />;
      case 'conventions':
        return <ConventionsTab projectPath={projectPath} projectId={selectedProject.id} isParent={isParent} childProjectIds={childProjectIds} />;
      case 'notepad':
        return <NotepadTab projectPath={projectPath} projectId={selectedProject.id} isParent={isParent} childProjectIds={childProjectIds} />;
      case 'bugs':
        return <BugsTab projectPath={projectPath} projectId={selectedProject.id} isParent={isParent} childProjectIds={childProjectIds} />;
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

  // Sortable Parent Row Component
  const SortableParentRow = ({ project }: { project: Project }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: project.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    const children = getChildren(project.id);
    const isExpanded = expandedParents.has(project.id);
    const hasChildren = children.length > 0;

    // Aggregate child info
    const devChildren = children.filter(c => detectEnvironment(c) === 'dev');
    const testChildren = children.filter(c => detectEnvironment(c) === 'test');
    const prodChildren = children.filter(c => detectEnvironment(c) === 'prod');

    // Get all ports from children
    const childDevPorts = children.filter(c => c.port_dev).map(c => c.port_dev);
    const childTestPorts = children.filter(c => c.port_test).map(c => c.port_test);
    const childProdPorts = children.filter(c => c.port_prod).map(c => c.port_prod);

    return (
      <div ref={setNodeRef} style={style} className="mb-2">
        {/* Parent Row */}
        <div
          className={`bg-gray-800 border rounded-lg p-4 transition-colors group ${
            overId === project.id && activeId && !projects.find(p => p.id === activeId)?.is_parent
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-gray-700 hover:border-blue-500'
          }`}
        >
          <div className="flex items-center gap-3">
            {/* Drag Handle */}
            <button
              {...attributes}
              {...listeners}
              className="p-1 text-gray-600 hover:text-white cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="w-4 h-4" />
            </button>

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
              </div>
              {/* Child environment summary */}
              {hasChildren && (
                <div className="flex items-center gap-2 mt-1">
                  {devChildren.length > 0 && (
                    <span className="px-1.5 py-0.5 bg-blue-600/20 text-blue-400 rounded text-[10px]">
                      {devChildren.length} Dev
                    </span>
                  )}
                  {testChildren.length > 0 && (
                    <span className="px-1.5 py-0.5 bg-yellow-600/20 text-yellow-400 rounded text-[10px]">
                      {testChildren.length} Test
                    </span>
                  )}
                  {prodChildren.length > 0 && (
                    <span className="px-1.5 py-0.5 bg-green-600/20 text-green-400 rounded text-[10px]">
                      {prodChildren.length} Prod
                    </span>
                  )}
                  {children.length > 0 && devChildren.length === 0 && testChildren.length === 0 && prodChildren.length === 0 && (
                    <span className="text-gray-500 text-[10px]">{children.length} projects</span>
                  )}
                </div>
              )}
            </div>

            {/* Dev/Test/Prod ports - one of each */}
            <div className="flex items-center gap-2">
              {(childDevPorts[0] || project.port_dev) && (
                <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded text-xs">
                  :{childDevPorts[0] || project.port_dev}
                </span>
              )}
              {(childTestPorts[0] || project.port_test) && (
                <span className="px-2 py-0.5 bg-yellow-600/20 text-yellow-400 rounded text-xs">
                  :{childTestPorts[0] || project.port_test}
                </span>
              )}
              {(childProdPorts[0] || project.port_prod) && (
                <span className="px-2 py-0.5 bg-green-600/20 text-green-400 rounded text-xs">
                  :{childProdPorts[0] || project.port_prod}
                </span>
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
            <SortableContext items={children.map(c => c.id)} strategy={verticalListSortingStrategy}>
              {children.map(child => (
                <SortableChildRow key={child.id} child={child} />
              ))}
            </SortableContext>
          </div>
        )}
      </div>
    );
  };

  // Sortable Child Row Component
  const SortableChildRow = ({ child }: { child: Project }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: child.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    const env = detectEnvironment(child);
    const envColor = env ? ENV_COLORS[env] : null;

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors group
          ${envColor ? `${envColor.bg} border ${envColor.border}` : 'bg-gray-800 border border-gray-700'}
          hover:brightness-110`}
      >
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="p-1 text-gray-500 hover:text-white cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3 h-3" />
        </button>

        {/* Environment Badge */}
        {envColor && (
          <span className={`px-2 py-1 rounded text-xs font-medium ${envColor.text} ${envColor.bg}`}>
            {envColor.label}
          </span>
        )}

        {/* Name */}
        <span
          className={`font-medium flex-1 ${envColor ? envColor.text : 'text-white'}`}
          onClick={() => handleSelectProject(child)}
        >
          {child.name}
        </span>

        {/* Port */}
        {(child.port_dev || child.port_test || child.port_prod) && (
          <span className="text-gray-500 text-xs">
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
  };

  // Sortable Orphan Row Component
  const SortableOrphanRow = ({ project }: { project: Project }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: project.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    const env = detectEnvironment(project);
    const envColor = env ? ENV_COLORS[env] : null;

    return (
      <div
        ref={setNodeRef}
        style={style}
        className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-blue-500 transition-colors cursor-pointer group mb-2"
      >
        <div className="flex items-center gap-3">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="p-1 text-gray-600 hover:text-white cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-4 h-4" />
          </button>

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
          <div className="flex-1" onClick={() => handleSelectProject(project)}>
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
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">Project Management</h1>
              {selectedClient && (
                <span className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-lg text-sm flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  {selectedClient.name}
                </span>
              )}
            </div>
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
                  <SortableParentRow key={parent.id} project={parent} />
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
                  <SortableOrphanRow key={project.id} project={project} />
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
