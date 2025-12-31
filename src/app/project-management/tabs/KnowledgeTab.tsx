'use client';

import { useState, useEffect } from 'react';
import { Brain, Search, Clock, ChevronDown, ChevronRight, ChevronUp, Plus, Lightbulb, FileText, Scale, GraduationCap, X, Edit2, Trash2, FolderOpen } from 'lucide-react';

interface ProjectPath {
  id: string;
  project_id: string;
  path: string;
  label: string;
  sort_order: number;
  created_at: string;
}

interface KnowledgeEntry {
  id: string;
  project_path: string;
  category: string;
  title: string;
  summary?: string;
  content: string;
  author?: string;
  source?: string;
  created_at: string;
  updated_at: string;
}

interface KnowledgeTabProps {
  projectPath: string;
  projectId: string;
  projectName?: string;
  isParent?: boolean;
  childProjectIds?: string[];
}

// Category config - matches database category values
const CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string; activeColor: string; description: string }> = {
  'Work Log': {
    label: 'Work Log',
    icon: FileText,
    color: 'bg-blue-600/20 text-blue-400 border-blue-500',
    activeColor: 'bg-blue-600 text-white',
    description: 'What was done, when, by who',
  },
  'Ideas': {
    label: 'Ideas',
    icon: Lightbulb,
    color: 'bg-yellow-600/20 text-yellow-400 border-yellow-500',
    activeColor: 'bg-yellow-600 text-white',
    description: 'Future features, improvements',
  },
  'Decisions': {
    label: 'Decisions',
    icon: Scale,
    color: 'bg-purple-600/20 text-purple-400 border-purple-500',
    activeColor: 'bg-purple-600 text-white',
    description: 'Why things were built this way',
  },
  'Journal': {
    label: 'Journal',
    icon: GraduationCap,
    color: 'bg-green-600/20 text-green-400 border-green-500',
    activeColor: 'bg-green-600 text-white',
    description: 'Session notes and learnings',
  },
};

// Default categories to show in tabs
const DEFAULT_CATEGORIES = ['Work Log', 'Ideas', 'Decisions', 'Journal'];

export default function KnowledgeTab({ projectPath, projectId, projectName, isParent, childProjectIds }: KnowledgeTabProps) {
  const [projectPaths, setProjectPaths] = useState<ProjectPath[]>([]);
  const [selectedPath, setSelectedPath] = useState<ProjectPath | null>(null);
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [grouped, setGrouped] = useState<Record<string, KnowledgeEntry[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('Work Log');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null);
  const [formData, setFormData] = useState({
    category: 'Work Log',
    title: '',
    content: '',
    author: '',
  });

  // Fetch knowledge directly using projectPath (like TodosTab)
  useEffect(() => {
    fetchKnowledge(projectId);
  }, [projectPath]);

  // Also fetch project paths for folder selector
  useEffect(() => {
    fetchProjectPaths();
  }, [projectId]);

  const fetchProjectPaths = async () => {
    try {
      // If parent, fetch paths for all child projects
      const projectIdsToFetch = isParent && childProjectIds?.length
        ? childProjectIds
        : [projectId];

      const allPaths: ProjectPath[] = [];

      for (const pid of projectIdsToFetch) {
        const response = await fetch(`/project-management/api/project-paths?project_id=${pid}`);
        const data = await response.json();
        if (data.success && data.paths) {
          allPaths.push(...data.paths);
        }
      }

      // If no project_paths exist but we have a projectPath prop, create a virtual entry
      if (allPaths.length === 0 && projectPath) {
        const virtualPath: ProjectPath = {
          id: 'virtual-main',
          project_id: projectId,
          path: projectPath,
          label: projectPath.split('/').pop() || 'Main',
          sort_order: 0,
          created_at: new Date().toISOString(),
        };
        allPaths.push(virtualPath);
      }

      setProjectPaths(allPaths);
      const mainPath = allPaths.find((p: ProjectPath) => p.path === projectPath);
      if (mainPath) {
        setSelectedPath(mainPath);
      } else if (allPaths.length > 0) {
        setSelectedPath(allPaths[0]);
      }
    } catch (error) {
      console.error('Error fetching project paths:', error);
    }
  };

  const moveFolder = async (folderId: string, direction: 'up' | 'down') => {
    const currentIndex = projectPaths.findIndex(p => p.id === folderId);
    if (currentIndex === -1) return;
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= projectPaths.length) return;
    const currentFolder = projectPaths[currentIndex];
    const swapFolder = projectPaths[swapIndex];
    const newPaths = [...projectPaths];
    newPaths[currentIndex] = { ...swapFolder, sort_order: currentFolder.sort_order };
    newPaths[swapIndex] = { ...currentFolder, sort_order: swapFolder.sort_order };
    newPaths.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    setProjectPaths(newPaths);
    try {
      await Promise.all([
        fetch('/project-management/api/project-paths', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: currentFolder.id, sort_order: swapFolder.sort_order || swapIndex }) }),
        fetch('/project-management/api/project-paths', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: swapFolder.id, sort_order: currentFolder.sort_order || currentIndex }) }),
      ]);
    } catch (error) { console.error('Error moving folder:', error); fetchProjectPaths(); }
  };
  const fetchKnowledge = async (id: string) => {
    if (!id) return;
    setIsLoading(true);
    try {
      const idsToFetch = isParent && childProjectIds?.length
        ? [id, ...childProjectIds]
        : [id];

      const allEntries: KnowledgeEntry[] = [];

      for (const pid of idsToFetch) {
        // dev_ai_knowledge (Ideas, Quirks & Gotchas, Other)
        const knowledgeRes = await fetch(`/project-management/api/clair/knowledge/${pid}`);
        const knowledgeData = await knowledgeRes.json();
        if (knowledgeData.success && knowledgeData.entries) {
          allEntries.push(...knowledgeData.entries);
        }

        // dev_ai_journal (Work Log, Journal)
        const journalRes = await fetch(`/project-management/api/clair/journal/${pid}`);
        const journalData = await journalRes.json();
        if (journalData.success && journalData.entries) {
          const mappedJournal = journalData.entries.map((e: any) => {
            // Normalize entry_type to match tab categories
            let category = e.entry_type || 'Journal';
            if (category === 'worklog' || category === 'work_log') {
              category = 'Work Log';
            }
            return { ...e, category };
          });
          allEntries.push(...mappedJournal);
        }

        // dev_ai_decisions (Decisions)
        const decisionsRes = await fetch(`/project-management/api/clair/decisions/${pid}`);
        const decisionsData = await decisionsRes.json();
        if (decisionsData.success && decisionsData.entries) {
          const mappedDecisions = decisionsData.entries.map((e: any) => ({
            ...e,
            category: 'Decisions',
          }));
          allEntries.push(...mappedDecisions);
        }
      }

      allEntries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const grouped: Record<string, KnowledgeEntry[]> = {};
      for (const entry of allEntries) {
        const cat = entry.category || "other";
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(entry);
      }

      setEntries(allEntries);
      setGrouped(grouped);
    } catch (error) {
      console.error("Error fetching knowledge:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.content || !selectedPath) return;
    try {
      const projectId = selectedPath.path.startsWith('/') ? selectedPath.path.slice(1) : selectedPath.path;
      const url = editingEntry
        ? `/project-management/api/clair/knowledge/${projectId}/${editingEntry.id}`
        : `/project-management/api/clair/knowledge/${projectId}`;
      const method = editingEntry ? 'PATCH' : 'POST';

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      resetForm();
      fetchKnowledge(selectedPath.path);
    } catch (error) {
      console.error('Error saving entry:', error);
    }
  };

  const handleDelete = async (entry: KnowledgeEntry) => {
    if (!confirm('Delete this entry?')) return;
    try {
      // Use the component's projectId prop directly
      await fetch(`/project-management/api/clair/knowledge/${projectId}/${entry.id}`, { method: 'DELETE' });
      fetchKnowledge(projectId);
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  const startEdit = (entry: KnowledgeEntry) => {
    setEditingEntry(entry);
    setFormData({
      category: entry.category,
      title: entry.title,
      content: entry.content,
      author: entry.author || '',
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setShowAddForm(false);
    setEditingEntry(null);
    setFormData({ category: activeCategory, title: '', content: '', author: '' });
  };

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const currentEntries = (grouped[activeCategory] || []).filter(entry => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return entry.title.toLowerCase().includes(q) || entry.content.toLowerCase().includes(q);
  });

  const config = CATEGORY_CONFIG[activeCategory] || CATEGORY_CONFIG['Work Log'];
  const Icon = config.icon;

  return (
    <div className="flex h-full gap-4">
      {/* Left Panel - Project Folders */}
      <div className="w-64 flex-shrink-0 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <div className="p-3 border-b border-gray-700">
          <h3 className="text-white font-semibold text-sm">Project Folders</h3>
        </div>

        <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
          {projectPaths.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No folders linked</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {projectPaths.map((path, index) => (
                <div
                  key={path.id}
                  className={`p-3 cursor-pointer group ${
                    selectedPath?.id === path.id
                      ? 'bg-purple-600/20 border-l-2 border-purple-500'
                      : 'hover:bg-gray-750'
                  }`}
                  onClick={() => setSelectedPath(path)}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); moveFolder(path.id, 'up'); }}
                        disabled={index === 0}
                        className={`p-0.5 rounded ${index === 0 ? 'text-gray-700' : 'text-gray-500 hover:text-white hover:bg-gray-600'}`}
                      ><ChevronUp className="w-3 h-3" /></button>
                      <button
                        onClick={(e) => { e.stopPropagation(); moveFolder(path.id, 'down'); }}
                        disabled={index === projectPaths.length - 1}
                        className={`p-0.5 rounded ${index === projectPaths.length - 1 ? 'text-gray-700' : 'text-gray-500 hover:text-white hover:bg-gray-600'}`}
                      ><ChevronDown className="w-3 h-3" /></button>
                    </div>
                    <FolderOpen className={`w-4 h-4 ${
                      selectedPath?.id === path.id ? 'text-purple-400' : 'text-yellow-400'
                    }`} />
                    <span className="text-white font-medium text-sm flex-1">{path.label}</span>
                  </div>
                  <p className="text-gray-600 text-[10px] font-mono mt-1 pl-12 truncate">
                    {path.path.split('/').pop()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Journal */}
      <div className="flex-1 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden flex flex-col">
        {selectedPath ? (
          <>
            {/* Header with tabs */}
            <div className="border-b border-gray-700">
              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-400" />
                  <h3 className="text-white font-semibold">{projectName || selectedPath?.label || 'Project'} Knowledge</h3>
                  <span className="text-gray-500 text-sm">({entries.length} entries)</span>
                </div>
                <button
                  onClick={() => {
                    setFormData({ ...formData, category: activeCategory });
                    setShowAddForm(true);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Entry
                </button>
              </div>

              {/* Category Tabs */}
              <div className="flex px-3 -mb-px">
                {DEFAULT_CATEGORIES.map((cat) => {
                  const cfg = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG['Work Log'];
                  const TabIcon = cfg.icon;
                  const count = grouped[cat]?.length || 0;
                  const isActive = activeCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                        isActive
                          ? `${cfg.activeColor} border-current`
                          : 'text-gray-400 border-transparent hover:text-white hover:border-gray-600'
                      }`}
                    >
                      <TabIcon className="w-4 h-4" />
                      {cfg.label}
                      <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${isActive ? 'bg-white/20' : 'bg-gray-700'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Description */}
            <div className={`px-4 py-2 text-sm ${config.color} border-b border-gray-700`}>
              <Icon className="w-4 h-4 inline mr-2" />
              {config.description}
            </div>

            {/* Add/Edit Form */}
            {showAddForm && (
              <div className="p-4 border-b border-gray-700 bg-gray-750 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-white font-medium">
                    {editingEntry ? 'Edit Entry' : `New ${(CATEGORY_CONFIG[formData.category] || CATEGORY_CONFIG['Work Log']).label} Entry`}
                  </h4>
                  <button onClick={resetForm} className="text-gray-500 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                  >
                    {DEFAULT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{(CATEGORY_CONFIG[cat] || {}).label || cat}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Author (optional)"
                    value={formData.author}
                    onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                />
                <textarea
                  placeholder="Content..."
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm resize-none"
                />
                <div className="flex justify-end gap-2">
                  <button onClick={resetForm} className="px-3 py-1.5 text-gray-400 hover:text-white">
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
                  >
                    {editingEntry ? 'Update' : 'Save'}
                  </button>
                </div>
              </div>
            )}

            {/* Search */}
            <div className="p-3 border-b border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder={`Search ${config.label.toLowerCase()}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
                />
              </div>
            </div>

            {/* Entries List */}
            <div className="flex-1 overflow-y-auto p-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Brain className="w-6 h-6 text-purple-400 animate-pulse" />
                </div>
              ) : currentEntries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Icon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No {config.label.toLowerCase()} entries</p>
                  <p className="text-sm mt-1">{config.description}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {currentEntries.map(entry => (
                    <div
                      key={entry.id}
                      className="bg-gray-750 border border-gray-700 rounded-lg overflow-hidden"
                    >
                      <div
                        className="p-3 cursor-pointer hover:bg-gray-700 flex items-start gap-3"
                        onClick={() => toggleExpand(entry.id)}
                      >
                        <button className="text-gray-500 mt-0.5">
                          {expandedItems.has(entry.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <span className="text-white font-medium">{entry.title}</span>
                          {!expandedItems.has(entry.id) && (
                            <p className="text-gray-400 text-sm truncate mt-1">{entry.content}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-gray-500 text-xs whitespace-nowrap">
                          {entry.author && <span className="text-gray-600">{entry.author}</span>}
                          <Clock className="w-3 h-3" />
                          {formatDate(entry.created_at)}
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                          <button
                            onClick={(e) => { e.stopPropagation(); startEdit(entry); }}
                            className="p-1 text-gray-500 hover:text-white hover:bg-gray-600 rounded"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(entry); }}
                            className="p-1 text-gray-500 hover:text-red-400 hover:bg-gray-600 rounded"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {expandedItems.has(entry.id) && (
                        <div className="px-10 pb-3 border-t border-gray-700 pt-3">
                          <p className="text-gray-300 text-sm whitespace-pre-wrap">{entry.content}</p>
                          <div className="flex items-center gap-2 mt-3">
                            <button
                              onClick={() => startEdit(entry)}
                              className="text-xs text-gray-500 hover:text-white flex items-center gap-1"
                            >
                              <Edit2 className="w-3 h-3" /> Edit
                            </button>
                            <button
                              onClick={() => handleDelete(entry)}
                              className="text-xs text-gray-500 hover:text-red-400 flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" /> Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Select a folder to view knowledge</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
