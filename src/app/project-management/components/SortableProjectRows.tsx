'use client';

import { ChevronRight, ChevronDown, Settings, GripVertical } from 'lucide-react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Project } from '../types';

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

interface SortableParentRowProps {
  project: Project;
  children: Project[];
  isExpanded: boolean;
  overId: string | null;
  activeId: string | null;
  allProjects: Project[];
  onToggle: () => void;
  onSelect: (project: Project) => void;
  onEdit: (project: Project) => void;
}

export function SortableParentRow({
  project,
  children,
  isExpanded,
  overId,
  activeId,
  allProjects,
  onToggle,
  onSelect,
  onEdit,
}: SortableParentRowProps) {
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
          overId === project.id && activeId && !allProjects.find(p => p.id === activeId)?.is_parent
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
            onClick={onToggle}
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
            onClick={() => onSelect(project)}
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
            onClick={(e) => { e.stopPropagation(); onEdit(project); }}
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
              <SortableChildRow
                key={child.id}
                child={child}
                onSelect={onSelect}
                onEdit={onEdit}
              />
            ))}
          </SortableContext>
        </div>
      )}
    </div>
  );
}

interface SortableChildRowProps {
  child: Project;
  onSelect: (project: Project) => void;
  onEdit: (project: Project) => void;
}

export function SortableChildRow({ child, onSelect, onEdit }: SortableChildRowProps) {
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
        onClick={() => onSelect(child)}
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
        onClick={(e) => { e.stopPropagation(); onEdit(child); }}
        className="p-1 text-gray-500 hover:text-white hover:bg-gray-600 rounded opacity-0 group-hover:opacity-100 transition-all"
      >
        <Settings className="w-3 h-3" />
      </button>
    </div>
  );
}

interface SortableOrphanRowProps {
  project: Project;
  onSelect: (project: Project) => void;
  onEdit: (project: Project) => void;
}

export function SortableOrphanRow({ project, onSelect, onEdit }: SortableOrphanRowProps) {
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
        <div className="flex-1" onClick={() => onSelect(project)}>
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
          onClick={(e) => { e.stopPropagation(); onEdit(project); }}
          className="p-2 text-gray-500 hover:text-white hover:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-all"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
