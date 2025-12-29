'use client';

import { useState, useEffect } from 'react';
import { Flame, Gamepad2, Lightbulb, Wrench, Sparkles, Brain, Plus, Trash2, ChevronRight } from 'lucide-react';

interface ForgeEntry {
  id: string;
  title: string;
  summary: string | null;
  entry_type: string;
  status: 'raw' | 'shaping' | 'cooling' | 'forged' | 'discarded';
  project_id: string | null;
  created_at: string;
  updated_at: string;
}

const ENTRY_TYPES = [
  { id: 'app', label: 'App Idea', icon: Lightbulb, color: 'text-yellow-500' },
  { id: 'game', label: 'Game Concept', icon: Gamepad2, color: 'text-purple-500' },
  { id: 'feature', label: 'Feature Experiment', icon: Sparkles, color: 'text-blue-500' },
  { id: 'tool', label: 'Tool Idea', icon: Wrench, color: 'text-green-500' },
  { id: 'thought', label: 'Half-Baked Thought', icon: Brain, color: 'text-orange-500' },
];

const STATUS_LABELS = {
  raw: { label: 'Raw', color: 'bg-gray-600' },
  shaping: { label: 'Shaping', color: 'bg-orange-600' },
  cooling: { label: 'Cooling', color: 'bg-blue-600' },
  forged: { label: 'Forged', color: 'bg-green-600' },
  discarded: { label: 'Discarded', color: 'bg-red-900' },
};

export default function TheForgePage() {
  const [entries, setEntries] = useState<ForgeEntry[]>([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      const res = await fetch('/the-forge/api');
      const data = await res.json();
      setEntries(data);
    } catch (err) {
      console.error('Failed to fetch forge entries:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = selectedType
    ? entries.filter(e => e.entry_type === selectedType)
    : entries;

  const getTypeInfo = (type: string) => {
    return ENTRY_TYPES.find(t => t.id === type) || ENTRY_TYPES[4];
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Flame className="w-10 h-10 text-orange-500" />
        <div>
          <h1 className="text-3xl font-bold">The Forge</h1>
          <p className="text-gray-400">Ideas are heated, shaped, discarded, reforged</p>
        </div>
      </div>

      {/* Type Filters */}
      <div className="flex flex-wrap gap-3 mb-8">
        <button
          onClick={() => setSelectedType(null)}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
            !selectedType ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          <Flame className="w-4 h-4" />
          All ({entries.length})
        </button>
        {ENTRY_TYPES.map(type => {
          const count = entries.filter(e => e.entry_type === type.id).length;
          const Icon = type.icon;
          return (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                selectedType === type.id ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Icon className={`w-4 h-4 ${type.color}`} />
              {type.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Entries Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading forge entries...</div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-12">
          <Flame className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400">No ideas in the forge yet</p>
          <p className="text-gray-500 text-sm">Brainstorm ideas will appear here automatically</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEntries.map(entry => {
            const typeInfo = getTypeInfo(entry.entry_type);
            const Icon = typeInfo.icon;
            const status = STATUS_LABELS[entry.status] || STATUS_LABELS.raw;

            return (
              <div
                key={entry.id}
                className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-orange-600/50 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${typeInfo.color}`} />
                    <span className="text-xs text-gray-500">{typeInfo.label}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${status.color}`}>
                    {status.label}
                  </span>
                </div>

                <h3 className="font-medium text-white mb-2 line-clamp-2">{entry.title}</h3>

                {entry.summary && (
                  <p className="text-sm text-gray-400 line-clamp-3 mb-3">{entry.summary}</p>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{new Date(entry.created_at).toLocaleDateString()}</span>
                  <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
