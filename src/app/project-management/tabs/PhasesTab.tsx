'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, Circle, Plus, Trash2, Edit2, X, Check } from 'lucide-react';
import { Phase, PhaseItem } from '../types';

interface PhasesTabProps {
  projectPath: string;
  projectId: string;
  projectName?: string;
  isParent?: boolean;
  childProjectIds?: string[];
}

interface PhaseWithItems extends Phase {
  items: PhaseItem[];
}

const scrollbarStyles = `
  .scrollbar-blue::-webkit-scrollbar { height: 12px; }
  .scrollbar-blue::-webkit-scrollbar-track { background: #1f2937; border-radius: 6px; }
  .scrollbar-blue::-webkit-scrollbar-thumb { background: #3b82f6; border-radius: 6px; border: 2px solid #1f2937; }
  .scrollbar-blue::-webkit-scrollbar-thumb:hover { background: #2563eb; }
`;

export default function PhasesTab({ projectId, projectName }: PhasesTabProps) {
  const [phases, setPhases] = useState<PhaseWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addingToPhase, setAddingToPhase] = useState<string | null>(null);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const phasesRes = await fetch(`/project-management/api/phases/${projectId}`);
      const phasesData = await phasesRes.json();

      if (phasesData.success && phasesData.phases) {
        const phasesWithItems = await Promise.all(
          phasesData.phases.map(async (phase: Phase) => {
            const itemsRes = await fetch(`/project-management/api/phase-items?phase_id=${phase.id}`);
            const itemsData = await itemsRes.json();
            return {
              ...phase,
              items: itemsData.success ? itemsData.items : [],
            };
          })
        );
        setPhases(phasesWithItems);
      }
    } catch (err) {
      console.error('Error fetching phases:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleItem = async (item: PhaseItem) => {
    const newStatus = item.status === 'completed' ? 'pending' : 'completed';
    try {
      await fetch(`/project-management/api/phase-items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchData();
    } catch (err) {
      console.error('Error toggling item:', err);
    }
  };

  const handleAddItem = async (phaseId: string) => {
    if (!newItemTitle.trim()) return;
    try {
      const phase = phases.find(p => p.id === phaseId);
      const sortOrder = phase ? phase.items.length : 0;
      await fetch('/project-management/api/phase-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase_id: phaseId,
          title: newItemTitle.trim(),
          sort_order: sortOrder,
        }),
      });
      setNewItemTitle('');
      setAddingToPhase(null);
      fetchData();
    } catch (err) {
      console.error('Error adding item:', err);
    }
  };

  const handleUpdateItem = async (itemId: string) => {
    if (!editTitle.trim()) return;
    try {
      await fetch(`/project-management/api/phase-items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle.trim() }),
      });
      setEditingItem(null);
      setEditTitle('');
      fetchData();
    } catch (err) {
      console.error('Error updating item:', err);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await fetch(`/project-management/api/phase-items/${itemId}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };

  const startEditing = (item: PhaseItem) => {
    setEditingItem(item.id);
    setEditTitle(item.title);
  };

  const displayName = projectName || 'Project';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <style>{scrollbarStyles}</style>

      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between bg-gray-800">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-yellow-400" />
          <h3 className="text-white font-semibold">{displayName} Phases</h3>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Kanban View */}
      <div className="flex-1 overflow-x-auto p-4 scrollbar-blue">
        <div className="flex gap-4 min-w-max h-full">
          {phases.map(phase => {
            const completedCount = phase.items.filter(i => i.status === 'completed').length;
            const allComplete = phase.items.length > 0 && completedCount === phase.items.length;
            const isAdding = addingToPhase === phase.id;

            return (
              <div key={phase.id} className="w-80 flex-shrink-0 flex flex-col">
                {/* Phase Header */}
                <div className={`p-3 rounded-t-lg border-b ${allComplete ? 'bg-green-900/30 border-green-600' : 'bg-gray-750 border-gray-600'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-medium ${allComplete ? 'text-green-400' : 'text-white'}`}>
                      Phase {phase.phase_num}: {phase.name}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${allComplete ? 'bg-green-600/30 text-green-400' : 'bg-gray-600 text-gray-400'}`}>
                      {completedCount}/{phase.items.length}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${allComplete ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{ width: phase.items.length > 0 ? `${(completedCount / phase.items.length) * 100}%` : '0%' }}
                    />
                  </div>
                </div>

                {/* Phase Items */}
                <div className="flex-1 bg-gray-800 border border-gray-700 border-t-0 rounded-b-lg p-2 space-y-1 overflow-y-auto max-h-[calc(100vh-280px)]">
                  {phase.items.map(item => {
                    const isCompleted = item.status === 'completed';
                    const isEditingThis = editingItem === item.id;

                    return (
                      <div
                        key={item.id}
                        className={`flex items-start gap-2 p-2 rounded hover:bg-gray-700/50 group ${isCompleted ? 'opacity-60' : ''}`}
                      >
                        <button
                          onClick={() => handleToggleItem(item)}
                          className="mt-0.5 flex-shrink-0"
                        >
                          {isCompleted ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <Circle className="w-4 h-4 text-gray-400 hover:text-blue-400" />
                          )}
                        </button>

                        {isEditingThis ? (
                          <div className="flex-1 flex items-center gap-1">
                            <input
                              type="text"
                              value={editTitle}
                              onChange={e => setEditTitle(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleUpdateItem(item.id)}
                              className="flex-1 bg-gray-900 border border-gray-600 rounded px-2 py-0.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                              autoFocus
                            />
                            <button onClick={() => handleUpdateItem(item.id)} className="p-0.5 text-green-400 hover:bg-green-400/20 rounded">
                              <Check className="w-3 h-3" />
                            </button>
                            <button onClick={() => setEditingItem(null)} className="p-0.5 text-gray-400 hover:bg-gray-700 rounded">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className={`text-sm flex-1 ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                              {item.title}
                            </span>
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
                              <button onClick={() => startEditing(item)} className="p-0.5 text-gray-400 hover:text-blue-400">
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button onClick={() => handleDeleteItem(item.id)} className="p-0.5 text-gray-400 hover:text-red-400">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}

                  {phase.items.length === 0 && !isAdding && (
                    <div className="text-center py-4 text-gray-500 text-sm">No items</div>
                  )}

                  {/* Add Item */}
                  {isAdding ? (
                    <div className="flex items-center gap-2 p-2">
                      <Circle className="w-4 h-4 text-gray-600 flex-shrink-0" />
                      <input
                        type="text"
                        value={newItemTitle}
                        onChange={e => setNewItemTitle(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleAddItem(phase.id);
                          if (e.key === 'Escape') {
                            setAddingToPhase(null);
                            setNewItemTitle('');
                          }
                        }}
                        placeholder="New item..."
                        className="flex-1 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:border-blue-500 focus:outline-none"
                        autoFocus
                      />
                      <button onClick={() => handleAddItem(phase.id)} className="text-green-400 hover:text-green-300">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setAddingToPhase(null); setNewItemTitle(''); }} className="text-gray-400 hover:text-gray-300">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingToPhase(phase.id)}
                      className="flex items-center gap-2 w-full p-2 text-gray-500 hover:text-blue-400 text-sm hover:bg-gray-700/30 rounded"
                    >
                      <Plus className="w-4 h-4" />
                      Add item
                    </button>
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
    </div>
  );
}
