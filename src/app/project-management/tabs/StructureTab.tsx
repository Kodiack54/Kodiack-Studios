'use client';

import { useState, useEffect, useMemo } from 'react';
import { FolderTree, Folder, FolderOpen, File, Plus, Edit2, Trash2, X, Save, Search, RefreshCw, ChevronRight, ChevronDown } from 'lucide-react';

interface StructureItem {
  id: string;
  project_id: string;
  convention_type: string;
  name: string;
  description: string;
  example?: string; // Used for file annotations
  bucket: string;
  keywords: string[];
  status: string;
  created_at: string;
}

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  annotation?: string;
  id?: string;
  children: TreeNode[];
}

interface StructureTabProps {
  projectPath: string;
  projectId: string;
  projectName?: string;
  isParent?: boolean;
  childProjectIds?: string[];
}

// File extension colors
const EXT_COLORS: Record<string, string> = {
  'tsx': 'text-blue-400',
  'ts': 'text-blue-300',
  'js': 'text-yellow-400',
  'jsx': 'text-yellow-300',
  'css': 'text-pink-400',
  'json': 'text-green-400',
  'md': 'text-gray-400',
  'sql': 'text-orange-400',
  'sh': 'text-green-300',
  'py': 'text-yellow-500',
  'html': 'text-orange-400',
  'env': 'text-purple-400',
};

const getFileColor = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return EXT_COLORS[ext] || 'text-gray-500';
};

// Find common root path from all paths
const findCommonRoot = (paths: string[]): string => {
  if (paths.length === 0) return '';
  if (paths.length === 1) {
    const parts = paths[0].replace(/\\/g, '/').split('/');
    return parts.slice(0, -1).join('/');
  }

  const normalized = paths.map(p => p.replace(/\\/g, '/').split('/'));
  const minLen = Math.min(...normalized.map(p => p.length));

  let commonParts: string[] = [];
  for (let i = 0; i < minLen - 1; i++) {
    const part = normalized[0][i];
    if (normalized.every(p => p[i] === part)) {
      commonParts.push(part);
    } else {
      break;
    }
  }

  return commonParts.join('/');
};

// Build tree from flat file paths
const buildTree = (items: StructureItem[], commonRoot: string): TreeNode => {
  const root: TreeNode = {
    name: commonRoot.split('/').pop() || 'Project',
    path: commonRoot,
    isFolder: true,
    children: [],
  };

  const rootLen = commonRoot.length;

  for (const item of items) {
    const fullPath = (item.description || '').replace(/\\/g, '/');
    // Skip if path doesn't start with common root or is garbage
    if (!fullPath.startsWith(commonRoot) && commonRoot.length > 0) continue;
    if (!fullPath.includes('/') || fullPath.length < 5) continue;

    const relativePath = commonRoot.length > 0
      ? fullPath.slice(rootLen + 1)
      : fullPath;

    if (!relativePath) continue;

    const parts = relativePath.split('/').filter(p => p);
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const partPath = commonRoot + '/' + parts.slice(0, i + 1).join('/');

      let existing = current.children.find(c => c.name === part);

      if (!existing) {
        existing = {
          name: part,
          path: partPath,
          isFolder: !isFile,
          annotation: isFile ? item.example : undefined,
          id: isFile ? item.id : undefined,
          children: [],
        };
        current.children.push(existing);
      }

      if (!isFile) {
        current = existing;
      }
    }
  }

  // Sort: folders first, then alphabetically
  const sortChildren = (node: TreeNode) => {
    node.children.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.name.localeCompare(b.name);
    });
    node.children.forEach(sortChildren);
  };
  sortChildren(root);

  return root;
};

// Tree node component
interface TreeNodeRowProps {
  node: TreeNode;
  depth: number;
  isLast: boolean;
  parentPrefixes: string[];
  expandedFolders: Set<string>;
  toggleFolder: (path: string) => void;
  onEdit?: (id: string, name: string, annotation: string) => void;
  onDelete?: (id: string) => void;
}

const TreeNodeRow = ({
  node,
  depth,
  isLast,
  parentPrefixes,
  expandedFolders,
  toggleFolder,
  onEdit,
  onDelete,
}: TreeNodeRowProps) => {
  const isExpanded = expandedFolders.has(node.path);

  // Build prefix string
  const prefix = parentPrefixes.join('') + (isLast ? '└── ' : '├── ');
  const childPrefix = [...parentPrefixes, isLast ? '    ' : '│   '];

  return (
    <>
      <div
        className={`flex items-center gap-1 py-1 px-2 hover:bg-gray-700/50 group ${node.isFolder ? 'cursor-pointer' : ''}`}
        onClick={() => node.isFolder && toggleFolder(node.path)}
      >
        {/* Tree prefix */}
        <span className="text-gray-600 font-mono text-sm whitespace-pre select-none">
          {depth > 0 ? prefix : ''}
        </span>

        {/* Icon */}
        {node.isFolder ? (
          <>
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-yellow-400 flex-shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-yellow-400 flex-shrink-0" />
            )}
          </>
        ) : (
          <File className={`w-4 h-4 flex-shrink-0 ${getFileColor(node.name)}`} />
        )}

        {/* Name */}
        <span className={`font-mono text-sm ${node.isFolder ? 'text-yellow-300' : 'text-gray-300'}`}>
          {node.name}
        </span>

        {/* Folder expand indicator */}
        {node.isFolder && node.children.length > 0 && (
          <span className="text-gray-500 text-xs ml-1">
            ({node.children.length})
          </span>
        )}

        {/* File annotation */}
        {!node.isFolder && node.annotation && (
          <span className="text-gray-500 text-xs ml-2 truncate max-w-[200px]">
            # {node.annotation}
          </span>
        )}

        {/* Actions for files */}
        {!node.isFolder && node.id && (
          <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit?.(node.id!, node.name, node.annotation || ''); }}
              className="p-1 text-gray-500 hover:text-white hover:bg-gray-600 rounded"
              title="Edit annotation"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete?.(node.id!); }}
              className="p-1 text-gray-500 hover:text-red-400 hover:bg-gray-600 rounded"
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Children (if folder is expanded) */}
      {node.isFolder && isExpanded && node.children.map((child, idx) => (
        <TreeNodeRow
          key={child.path}
          node={child}
          depth={depth + 1}
          isLast={idx === node.children.length - 1}
          parentPrefixes={depth > 0 ? childPrefix : []}
          expandedFolders={expandedFolders}
          toggleFolder={toggleFolder}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </>
  );
};

export default function StructureTab({ projectId, projectName, isParent, childProjectIds }: StructureTabProps) {
  const [items, setItems] = useState<StructureItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', annotation: '' });
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchStructure();
  }, [projectId, isParent, childProjectIds]);

  const fetchStructure = async () => {
    setIsLoading(true);
    try {
      const projectIdsToFetch = isParent && childProjectIds?.length
        ? [projectId, ...childProjectIds]
        : [projectId];

      const allItems: StructureItem[] = [];

      for (const pid of projectIdsToFetch) {
        const res = await fetch(`/project-management/api/conventions?project_id=${pid}&convention_type=structure`);
        const data = await res.json();
        if (data.success && data.conventions) {
          allItems.push(...data.conventions);
        }
      }

      setItems(allItems);
    } catch (error) {
      console.error('Error fetching structure:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter items by search
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(item =>
      item.name.toLowerCase().includes(q) ||
      (item.description || '').toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  // Build tree from filtered items
  const { tree, commonRoot } = useMemo(() => {
    const paths = filteredItems
      .map(i => i.description || '')
      .filter(p => p && p.includes('/'));

    const commonRoot = findCommonRoot(paths);
    const tree = buildTree(filteredItems, commonRoot);

    // Auto-expand root
    if (commonRoot && !expandedFolders.has(commonRoot)) {
      setExpandedFolders(new Set([commonRoot]));
    }

    return { tree, commonRoot };
  }, [filteredItems]);

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allFolders = new Set<string>();
    const collectFolders = (node: TreeNode) => {
      if (node.isFolder) {
        allFolders.add(node.path);
        node.children.forEach(collectFolders);
      }
    };
    collectFolders(tree);
    setExpandedFolders(allFolders);
  };

  const collapseAll = () => {
    setExpandedFolders(new Set([commonRoot]));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    try {
      const url = editingId
        ? `/project-management/api/conventions/${editingId}`
        : '/project-management/api/conventions';

      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          convention_type: 'structure',
          name: formData.name,
          description: formData.description,
          example: formData.annotation,
        }),
      });

      const data = await res.json();
      if (data.success) {
        fetchStructure();
        resetForm();
      }
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this file entry?')) return;

    try {
      const res = await fetch(`/project-management/api/conventions/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchStructure();
      }
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const startEdit = (id: string, name: string, annotation: string) => {
    const item = items.find(i => i.id === id);
    setEditingId(id);
    setFormData({
      name: name,
      description: item?.description || '',
      annotation: annotation,
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setShowAddForm(false);
    setEditingId(null);
    setFormData({ name: '', description: '', annotation: '' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-yellow-400" />
            File Structure
          </h2>
          <p className="text-sm text-gray-400">
            {items.length} files discovered by Jen
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded"
            title="Expand all"
          >
            Expand
          </button>
          <button
            onClick={collapseAll}
            className="px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded"
            title="Collapse all"
          >
            Collapse
          </button>
          <button
            onClick={fetchStructure}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Add File
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm"
          />
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="mb-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-medium">
              {editingId ? 'Edit File Entry' : 'Add File Entry'}
            </h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">File Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., page.tsx"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Full Path</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., /var/www/project/src/page.tsx"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Annotation (optional)</label>
              <input
                type="text"
                value={formData.annotation}
                onChange={(e) => setFormData({ ...formData, annotation: e.target.value })}
                placeholder="e.g., Entry point, Main component"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={resetForm} className="px-4 py-2 text-gray-400 hover:text-white text-sm">
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
              >
                <Save className="w-4 h-4" />
                {editingId ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tree View */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FolderTree className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No file structure discovered yet.</p>
          <p className="text-sm mt-1">Jen will extract file paths from your coding sessions.</p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          {/* Tree container */}
          <div className="font-mono text-sm">
            <TreeNodeRow
              node={tree}
              depth={0}
              isLast={true}
              parentPrefixes={[]}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              onEdit={startEdit}
              onDelete={handleDelete}
            />
          </div>
        </div>
      )}
    </div>
  );
}
