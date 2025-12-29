'use client';

import { useState, useEffect } from 'react';
import { Database, Table, Plus, Edit2, Trash2, X, Save, Clock, Search, RefreshCw, Copy, Check, FileText, ChevronDown, ChevronRight, Lightbulb } from 'lucide-react';

interface DatabaseItem {
  id: string;
  project_id: string;
  convention_type: string;
  name: string;
  description: string;
  bucket: string;
  keywords: string[];
  status: string;
  created_at: string;
}

interface DatabaseTabProps {
  projectPath: string;
  projectId: string;
  projectName?: string;
  isParent?: boolean;
  childProjectIds?: string[];
}

type EntryType = 'schema' | 'usage' | 'pattern';

const formatDate = (d: string) => {
  const date = new Date(d);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Determine entry type from name prefix
const getEntryType = (name: string): EntryType => {
  const lower = name.toLowerCase();
  if (lower.startsWith('pattern:')) return 'pattern';
  if (lower.startsWith('usage:')) return 'usage';
  return 'schema';
};

// Extract clean name without prefix
const getCleanName = (name: string): string => {
  return name.replace(/^(Schema|Usage|Pattern|Table):\s*/i, '').trim();
};

export default function DatabaseTab({ projectId, projectName, isParent, childProjectIds }: DatabaseTabProps) {
  const [items, setItems] = useState<DatabaseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedUsage, setExpandedUsage] = useState<Set<string>>(new Set());
  const [formType, setFormType] = useState<EntryType>('schema');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  // Fetch database patterns from dev_ai_conventions
  useEffect(() => {
    fetchDatabasePatterns();
  }, [projectId, isParent, childProjectIds]);

  const fetchDatabasePatterns = async () => {
    setIsLoading(true);
    try {
      // If parent, fetch for all child projects + parent
      const projectIdsToFetch = isParent && childProjectIds?.length
        ? [projectId, ...childProjectIds]
        : [projectId];

      const allItems: DatabaseItem[] = [];

      for (const pid of projectIdsToFetch) {
        const res = await fetch(`/project-management/api/conventions?project_id=${pid}&convention_type=database`);
        const data = await res.json();
        if (data.success && data.conventions) {
          allItems.push(...data.conventions);
        }
      }

      // Sort by created_at descending
      allItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setItems(allItems);
    } catch (error) {
      console.error('Error fetching database patterns:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    // Add prefix based on form type if not already present
    let finalName = formData.name.trim();
    const existingType = getEntryType(finalName);
    if (existingType === 'schema' && formType !== 'schema') {
      // Name doesn't have a prefix, add one based on formType
      const prefix = formType === 'pattern' ? 'Pattern: ' : 'Usage: ';
      finalName = prefix + finalName;
    }

    try {
      const url = editingId
        ? `/project-management/api/conventions/${editingId}`
        : '/project-management/api/conventions';

      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          convention_type: 'database',
          name: finalName,
          description: formData.description,
        }),
      });

      const data = await res.json();
      if (data.success) {
        fetchDatabasePatterns();
        resetForm();
      }
    } catch (error) {
      console.error('Error saving database pattern:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this database pattern?')) return;

    try {
      const res = await fetch(`/project-management/api/conventions/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchDatabasePatterns();
      }
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const startEdit = (item: DatabaseItem) => {
    setEditingId(item.id);
    setFormType(getEntryType(item.name));
    setFormData({
      name: item.name,
      description: item.description || '',
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setShowAddForm(false);
    setEditingId(null);
    setFormType('schema');
    setFormData({ name: '', description: '' });
  };

  const toggleUsageExpand = (tableName: string) => {
    setExpandedUsage(prev => {
      const next = new Set(prev);
      if (next.has(tableName)) {
        next.delete(tableName);
      } else {
        next.add(tableName);
      }
      return next;
    });
  };

  // Separate items into categories
  const schemas = filteredItems.filter(item => getEntryType(item.name) === 'schema');
  const usageItems = filteredItems.filter(item => getEntryType(item.name) === 'usage');
  const patterns = filteredItems.filter(item => getEntryType(item.name) === 'pattern');

  // Group usage items by table name
  const usageByTable = usageItems.reduce((acc, item) => {
    const tableName = getCleanName(item.name).split(/\s+/)[0]; // First word is table name
    if (!acc[tableName]) acc[tableName] = [];
    acc[tableName].push(item);
    return acc;
  }, {} as Record<string, DatabaseItem[]>);

  const copyToClipboard = async (item: DatabaseItem) => {
    await navigator.clipboard.writeText(item.description || item.name);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredItems = items.filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return item.name.toLowerCase().includes(q) || (item.description || '').toLowerCase().includes(q);
  });

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
            <Database className="w-5 h-5 text-blue-400" />
            Database Documentation
          </h2>
          <p className="text-sm text-gray-400">
            {patterns.length} patterns, {Object.keys(usageByTable).length} tables, {schemas.length} schemas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDatabasePatterns}
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
            Add Entry
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
            placeholder="Search tables, patterns..."
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm"
          />
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="mb-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-medium">
              {editingId ? 'Edit Entry' : 'Add Entry'}
            </h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3">
            {/* Entry Type Selector */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Entry Type</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormType('pattern')}
                  className={`px-3 py-1.5 text-sm rounded ${formType === 'pattern' ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                >
                  Pattern
                </button>
                <button
                  type="button"
                  onClick={() => setFormType('usage')}
                  className={`px-3 py-1.5 text-sm rounded ${formType === 'usage' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                >
                  Table Usage
                </button>
                <button
                  type="button"
                  onClick={() => setFormType('schema')}
                  className={`px-3 py-1.5 text-sm rounded ${formType === 'schema' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                >
                  Schema (SQL)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {formType === 'pattern' ? 'Pattern Rule' : formType === 'usage' ? 'Table Name' : 'Table/Schema Name'}
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={
                  formType === 'pattern' ? 'e.g., Use project_id NOT project_path' :
                  formType === 'usage' ? 'e.g., dev_ai_todos' :
                  'e.g., Schema: dev_users'
                }
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {formType === 'pattern' ? 'Explanation (optional)' : formType === 'usage' ? 'Column/Usage Notes' : 'SQL Statement'}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={
                  formType === 'pattern' ? 'Why this pattern matters...' :
                  formType === 'usage' ? 'project_id (UUID), status: pending|completed...' :
                  'CREATE TABLE dev_users (...'
                }
                rows={formType === 'schema' ? 6 : 3}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm font-mono"
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

      {/* Empty State */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No database documentation yet.</p>
          <p className="text-sm mt-1">Add patterns, table usage notes, or schema definitions.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Patterns Section */}
          {patterns.length > 0 && (
            <div className="bg-gray-800/50 rounded-lg border border-amber-900/30 p-4">
              <h3 className="text-amber-400 font-medium flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4" />
                Patterns & Best Practices
              </h3>
              <ul className="space-y-2">
                {patterns.map(item => (
                  <li key={item.id} className="flex items-start gap-2 group">
                    <span className="text-amber-400 mt-0.5">•</span>
                    <div className="flex-1">
                      <span className="text-white text-sm">{getCleanName(item.name)}</span>
                      {item.description && (
                        <p className="text-gray-400 text-xs mt-0.5">{item.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEdit(item)}
                        className="p-1 text-gray-400 hover:text-white hover:bg-gray-600 rounded"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Table Usage Section */}
          {Object.keys(usageByTable).length > 0 && (
            <div className="bg-gray-800/50 rounded-lg border border-green-900/30 p-4">
              <h3 className="text-green-400 font-medium flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4" />
                Table Usage
              </h3>
              <div className="space-y-2">
                {Object.entries(usageByTable).map(([tableName, tableItems]) => (
                  <div key={tableName} className="border border-gray-700 rounded overflow-hidden">
                    <div
                      className="px-3 py-2 bg-gray-800 flex items-center gap-2 cursor-pointer hover:bg-gray-750"
                      onClick={() => toggleUsageExpand(tableName)}
                    >
                      {expandedUsage.has(tableName) ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                      <Table className="w-4 h-4 text-green-400" />
                      <span className="text-white font-mono text-sm">{tableName}</span>
                      <span className="text-gray-500 text-xs">({tableItems.length} entries)</span>
                    </div>
                    {expandedUsage.has(tableName) && (
                      <div className="px-3 py-2 bg-gray-900 border-t border-gray-700">
                        {tableItems.map(item => (
                          <div key={item.id} className="flex items-start gap-2 py-1 group">
                            <span className="text-green-400 mt-0.5">├─</span>
                            <div className="flex-1">
                              <span className="text-gray-300 text-sm">{item.description || getCleanName(item.name)}</span>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => startEdit(item)}
                                className="p-1 text-gray-400 hover:text-white hover:bg-gray-600 rounded"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="p-1 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Schemas Section */}
          {schemas.length > 0 && (
            <div>
              <h3 className="text-blue-400 font-medium flex items-center gap-2 mb-3">
                <Database className="w-4 h-4" />
                Schema Definitions ({schemas.length})
              </h3>
              <div className="space-y-3">
                {schemas.map(item => (
                  <div key={item.id} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                    {/* Table Header */}
                    <div
                      className="px-4 py-3 flex items-center gap-3 hover:bg-gray-750 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    >
                      <Table className="w-4 h-4 text-blue-400" />
                      <span className="text-white font-mono text-sm flex-1">{getCleanName(item.name)}</span>
                      <div className="flex items-center gap-2 text-gray-500 text-xs">
                        <Clock className="w-3 h-3" />
                        {formatDate(item.created_at)}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); copyToClipboard(item); }}
                          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-600 rounded"
                          title="Copy SQL"
                        >
                          {copiedId === item.id ? (
                            <Check className="w-3 h-3 text-green-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); startEdit(item); }}
                          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-600 rounded"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Expanded SQL Content */}
                    {expandedId === item.id && item.description && (
                      <div className="px-4 py-3 border-t border-gray-700 bg-gray-900">
                        <pre className="text-gray-300 text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                          {item.description}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
