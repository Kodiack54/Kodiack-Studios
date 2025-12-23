'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, Circle, Clock, ChevronDown, ChevronRight } from 'lucide-react';

interface Todo {
  id: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  created_at: string;
}

interface TodosTabProps {
  projectPath: string;
  projectId: string;
  projectName?: string;
  isParent?: boolean;
  childProjectIds?: string[];
}

const PRIORITY_CONFIG: Record<string, {label: string, color: string}> = {
  low: { label: 'Low', color: 'bg-gray-600/20 text-gray-400 border-gray-600' },
  medium: { label: 'Medium', color: 'bg-yellow-600/20 text-yellow-400 border-yellow-600' },
  high: { label: 'High', color: 'bg-orange-600/20 text-orange-400 border-orange-600' },
  critical: { label: 'Critical', color: 'bg-red-600/20 text-red-400 border-red-600' },
};

const STATUS_CONFIG: Record<string, {label: string, icon: any, color: string}> = {
  pending: { label: 'Pending', icon: Circle, color: 'text-gray-400' },
  in_progress: { label: 'In Progress', icon: Clock, color: 'text-yellow-400' },
  completed: { label: 'Completed', icon: CheckCircle, color: 'text-green-400' },
};

export default function TodosTab({ projectPath, projectId, projectName }: TodosTabProps) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => { fetchTodos(); }, [projectPath]);

  const fetchTodos = async () => {
    setIsLoading(true);
    try {
      const cleanPath = projectPath.startsWith('/') ? projectPath.slice(1) : projectPath;
      const res = await fetch('/project-management/api/clair/todos/' + cleanPath);
      const data = await res.json();
      if (data.success) setTodos(data.todos || []);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const handleStatusChange = async (todo: Todo, newStatus: string) => {
    const cleanPath = projectPath.startsWith('/') ? projectPath.slice(1) : projectPath;
    await fetch('/project-management/api/clair/todos/' + cleanPath + '/' + todo.id, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchTodos();
  };

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const filteredTodos = todos.filter(t => filter === 'all' || (filter === 'pending' ? t.status !== 'completed' : t.status === 'completed'));
  const counts = { all: todos.length, pending: todos.filter(t => t.status !== 'completed').length, completed: todos.filter(t => t.status === 'completed').length };
  const displayName = projectName || projectPath.split('/').pop() || 'Project';

  if (isLoading) return <div className="flex items-center justify-center py-12"><RefreshCw className="w-6 h-6 text-blue-400 animate-spin" /></div>;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-700 flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-blue-400" />
        <h3 className="text-white font-semibold">{displayName} TODOs</h3>
        <div className="flex items-center gap-1 bg-gray-700 rounded-lg p-0.5">
          {['all', 'pending', 'completed'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={'px-3 py-1 rounded text-xs ' + (filter === f ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white')}>
              {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f as keyof typeof counts]})
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-y-auto max-h-[calc(100vh-300px)] p-4">
        {filteredTodos.length === 0 ? (
          <div className="text-center py-8 text-gray-500"><CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>No {filter} todos</p></div>
        ) : (
          <div className="space-y-2">
            {filteredTodos.map(todo => {
              const pc = PRIORITY_CONFIG[todo.priority] || PRIORITY_CONFIG.medium;
              const sc = STATUS_CONFIG[todo.status] || STATUS_CONFIG.pending;
              const SI = sc.icon;
              return (
                <div key={todo.id} className={'bg-gray-750 border rounded-lg p-3 ' + pc.color.split(' ')[2]}>
                  <div className="flex items-start gap-3">
                    <button onClick={() => handleStatusChange(todo, todo.status === 'completed' ? 'pending' : 'completed')} className={'mt-0.5 ' + sc.color}><SI className="w-5 h-5" /></button>
                    <div className="flex-1">
                      <span className={'px-2 py-0.5 rounded text-xs ' + pc.color.split(' ').slice(0,2).join(' ')}>{pc.label}</span>
                      <h3 className={'font-medium mt-1 ' + (todo.status === 'completed' ? 'text-gray-500 line-through' : 'text-white')}>{todo.title}</h3>
                      {todo.description && (
                        <><button onClick={() => toggleExpand(todo.id)} className="text-gray-500 text-sm flex items-center gap-1 mt-1">
                          {expandedItems.has(todo.id) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}Details
                        </button>
                        {expandedItems.has(todo.id) && <p className="text-gray-400 text-sm mt-2">{todo.description}</p>}</>
                      )}
                      <div className="text-xs text-gray-500 mt-2 flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(todo.created_at)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
