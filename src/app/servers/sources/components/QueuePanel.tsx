'use client';

import { useState } from 'react';

interface QueueItem {
  id: string;
  url: string;
  type: 'service' | 'suppliers';
  status: string;
  added_at: string;
}

interface QueuePanelProps {
  queue: QueueItem[];
}

export default function QueuePanel({ queue }: QueuePanelProps) {
  const [newUrl, setNewUrl] = useState('');
  const [newType, setNewType] = useState<'service' | 'suppliers'>('service');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!newUrl.trim()) return;

    setAdding(true);
    try {
      const res = await fetch('/api/sources/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newUrl, type: newType }),
      });
      const result = await res.json();
      if (result.success) {
        setNewUrl('');
        window.location.reload();
      } else {
        alert(result.error || 'Failed to add');
      }
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
      <h3 className="text-lg font-semibold text-white mb-4">Discovery Queue</h3>

      {/* Add to Queue */}
      <div className="mb-4 space-y-2">
        <input
          type="text"
          placeholder="Enter URL to discover..."
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
        />
        <div className="flex gap-2">
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as 'service' | 'suppliers')}
            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="service">Service</option>
            <option value="suppliers">Suppliers</option>
          </select>
          <button
            onClick={handleAdd}
            disabled={adding || !newUrl.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {adding ? '...' : 'Add'}
          </button>
        </div>
      </div>

      {/* Queue Items */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {queue.map((item) => (
          <div
            key={item.id}
            className="bg-gray-900 border border-gray-700 rounded-lg p-3"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded ${
                item.type === 'service'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-green-500/20 text-green-400'
              }`}>
                {item.type}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded ${
                item.status === 'pending'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : item.status === 'processing'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-gray-700 text-gray-400'
              }`}>
                {item.status}
              </span>
            </div>
            <div className="text-xs text-gray-400 truncate">{item.url}</div>
          </div>
        ))}

        {queue.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            Queue is empty
          </div>
        )}
      </div>
    </div>
  );
}
