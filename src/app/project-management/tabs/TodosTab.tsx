'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, Circle, ChevronDown, Plus } from 'lucide-react';

interface Phase {
  id: string;
  phase_num: number;
  name: string;
  description?: string;
  status: string;
}

interface Todo {
  id: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  phase_id?: string;
  created_at: string;
}

interface TodosTabProps {
  projectPath: string;
  projectId: string;
  projectName?: string;
  isParent?: boolean;
  childProjectIds?: string[];
  parentId?: string;
}

const scrollbarStyles = `
  .scrollbar-blue::-webkit-scrollbar { height: 12px; }
  .scrollbar-blue::-webkit-scrollbar-track { background: #1f2937; border-radius: 6px; }
  .scrollbar-blue::-webkit-scrollbar-thumb { background: #3b82f6; border-radius: 6px; border: 2px solid #1f2937; }
  .scrollbar-blue::-webkit-scrollbar-thumb:hover { background: #2563eb; }
`;

export default function TodosTab({ projectPath, projectId, projectName, isParent, childProjectIds, parentId }: TodosTabProps) {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'unassigned'>('kanban');
  const [assigningTodo, setAssigningTodo] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, [projectPath, projectId, isParent, childProjectIds, parentId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // For phases: children use parent's phases, parents/orphans use their own
      const phaseProjectId = (!isParent && parentId) ? parentId : projectId;
      const phasesRes = await fetch(`/project-management/api/phases/${phaseProjectId}`);
      const phasesData = await phasesRes.json();
      if (phasesData.success) setPhases(phasesData.phases || []);

      // For todos: parents aggregate parent + all children, children/orphans use their own
      let allTodos: Todo[] = [];
      if (isParent && childProjectIds && childProjectIds.length > 0) {
        // Parent: fetch from parent itself + all children
        const allIds = [projectId, ...childProjectIds];
        const todoPromises = allIds.map(pid =>
          fetch(`/project-management/api/todos?project_id=${pid}`).then(r => r.json())
        );
        const results = await Promise.all(todoPromises);
        results.forEach(r => {
          if (r.success && r.todos) allTodos.push(...r.todos);
        });
      } else {
        // Child or orphan: fetch own todos
        const todosRes = await fetch(`/project-management/api/todos?project_id=${projectId}`);
        const todosData = await todosRes.json();
        if (todosData.success) allTodos = todosData.todos || [];
      }
      setTodos(allTodos);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const handleStatusChange = async (todo: Todo, newStatus: string) => {
    await fetch(`/project-management/api/todos`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: todo.id, status: newStatus }),
    });
    fetchData();
  };

  const handleAssignPhase = async (todoId: string, phaseId: string) => {
    await fetch(`/project-management/api/todos`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: todoId, phase_id: phaseId }),
    });
    setAssigningTodo(null);
    fetchData();
  };

  // Group todos by phase
  const todosByPhase = todos.reduce((acc, todo) => {
    const key = todo.phase_id || 'unassigned';
    if (!acc[key]) acc[key] = [];
    acc[key].push(todo);
    return acc;
  }, {} as Record<string, Todo[]>);

  const unassignedTodos = todosByPhase['unassigned'] || [];
  const displayName = projectName || projectPath.split('/').pop() || 'Project';

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><RefreshCw className="w-6 h-6 text-blue-400 animate-spin" /></div>;
  }

  return (
    <div className="h-full flex flex-col">
      <style>{scrollbarStyles}</style>

      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between bg-gray-800">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-blue-400" />
          <h3 className="text-white font-semibold">{displayName} Roadmap</h3>
        </div>
        <div className="flex bg-gray-700 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('kanban')}
            className={`px-3 py-1 rounded text-xs ${viewMode === 'kanban' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Phases ({phases.length})
          </button>
          <button
            onClick={() => setViewMode('unassigned')}
            className={`px-3 py-1 rounded text-xs ${viewMode === 'unassigned' ? 'bg-yellow-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Unassigned ({unassignedTodos.length})
          </button>
        </div>
      </div>

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="flex-1 overflow-x-auto p-4 scrollbar-blue">
          <div className="flex gap-4 min-w-max h-full">
            {phases.map(phase => {
              const phaseTodos = todosByPhase[phase.id] || [];
              const completedCount = phaseTodos.filter(t => t.status === 'completed').length;
              const allComplete = phaseTodos.length > 0 && completedCount === phaseTodos.length;

              return (
                <div key={phase.id} className="w-80 flex-shrink-0 flex flex-col">
                  {/* Phase Header */}
                  <div className={`p-3 rounded-t-lg border-b ${allComplete ? 'bg-green-900/30 border-green-600' : 'bg-gray-750 border-gray-600'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-medium ${allComplete ? 'text-green-400' : 'text-white'}`}>
                        Phase {phase.phase_num}: {phase.name}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${allComplete ? 'bg-green-600/30 text-green-400' : 'bg-gray-600 text-gray-400'}`}>
                        {completedCount}/{phaseTodos.length}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${allComplete ? 'bg-green-500' : 'bg-blue-500'}`}
                        style={{ width: phaseTodos.length > 0 ? `${(completedCount / phaseTodos.length) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>

                  {/* Phase Todos */}
                  <div className="flex-1 bg-gray-800 border border-gray-700 border-t-0 rounded-b-lg p-2 space-y-1 overflow-y-auto max-h-[calc(100vh-280px)]">
                    {phaseTodos.map(todo => {
                      const isCompleted = todo.status === 'completed';
                      return (
                        <div
                          key={todo.id}
                          className={`flex items-start gap-2 p-2 rounded hover:bg-gray-700/50 ${isCompleted ? 'opacity-60' : ''}`}
                        >
                          <button
                            onClick={() => handleStatusChange(todo, isCompleted ? 'pending' : 'completed')}
                            className="mt-0.5 flex-shrink-0"
                          >
                            {isCompleted ? (
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            ) : (
                              <Circle className="w-4 h-4 text-gray-400 hover:text-blue-400" />
                            )}
                          </button>
                          <span className={`text-sm ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                            {todo.title}
                          </span>
                        </div>
                      );
                    })}
                    {phaseTodos.length === 0 && (
                      <div className="text-center py-4 text-gray-500 text-sm">No items</div>
                    )}
                  </div>
                </div>
              );
            })}

            {phases.length === 0 && (
              <div className="w-full text-center py-12 text-gray-500">
                <p>No phases defined for this project</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unassigned View */}
      {viewMode === 'unassigned' && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4 mb-4">
            <p className="text-yellow-400 text-sm">
              These items need to be assigned to a phase. Click the dropdown to assign.
            </p>
          </div>

          <div className="space-y-2">
            {unassignedTodos.map(todo => {
              const isCompleted = todo.status === 'completed';
              const isAssigning = assigningTodo === todo.id;

              return (
                <div key={todo.id} className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleStatusChange(todo, isCompleted ? 'pending' : 'completed')}
                      className="mt-0.5"
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-400" />
                      )}
                    </button>

                    <div className="flex-1">
                      <p className={`${isCompleted ? 'text-gray-500 line-through' : 'text-white'}`}>
                        {todo.title}
                      </p>
                    </div>

                    {/* Assign dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setAssigningTodo(isAssigning ? null : todo.id)}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
                      >
                        <Plus className="w-3 h-3" />
                        Assign
                        <ChevronDown className="w-3 h-3" />
                      </button>

                      {isAssigning && (
                        <div className="absolute right-0 top-8 z-10 bg-gray-800 border border-gray-600 rounded-lg shadow-lg py-1 min-w-[200px]">
                          {phases.map(phase => (
                            <button
                              key={phase.id}
                              onClick={() => handleAssignPhase(todo.id, phase.id)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 text-gray-300"
                            >
                              Phase {phase.phase_num}: {phase.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {unassignedTodos.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>All todos are assigned to phases</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
