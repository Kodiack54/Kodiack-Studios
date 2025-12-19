'use client';

import { useState } from 'react';

interface CannedResponse {
  id: string;
  title: string;
  content: string;
  category?: string;
}

interface CannedResponsesListProps {
  responses: CannedResponse[];
}

export default function CannedResponsesList({ responses: initialResponses }: CannedResponsesListProps) {
  const [responses, setResponses] = useState(initialResponses);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', content: '', category: '' });
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('Title and content are required');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/helpdesk/canned-responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await res.json();

      if (result.success) {
        window.location.reload();
      } else {
        alert(result.error || 'Failed to create response');
      }
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('Title and content are required');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/helpdesk/canned-responses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await res.json();

      if (result.success) {
        window.location.reload();
      } else {
        alert(result.error || 'Failed to update response');
      }
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this response?')) return;

    try {
      const res = await fetch(`/api/helpdesk/canned-responses/${id}`, {
        method: 'DELETE',
      });

      const result = await res.json();

      if (result.success) {
        setResponses((prev) => prev.filter((r) => r.id !== id));
      } else {
        alert(result.error || 'Failed to delete response');
      }
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const startEdit = (response: CannedResponse) => {
    setEditingId(response.id);
    setFormData({
      title: response.title,
      content: response.content,
      category: response.category || '',
    });
    setIsCreating(false);
  };

  const startCreate = () => {
    setIsCreating(true);
    setEditingId(null);
    setFormData({ title: '', content: '', category: '' });
  };

  const cancelEdit = () => {
    setIsCreating(false);
    setEditingId(null);
    setFormData({ title: '', content: '', category: '' });
  };

  return (
    <div>
      {/* Create Button */}
      {!isCreating && !editingId && (
        <button
          onClick={startCreate}
          className="mb-6 px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-semibold hover:bg-purple-600 transition-colors"
        >
          + New Canned Response
        </button>
      )}

      {/* Create/Edit Form */}
      {(isCreating || editingId) && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            {isCreating ? 'Create Canned Response' : 'Edit Canned Response'}
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Response title"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                  placeholder="Optional category"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Content</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                placeholder="Response content..."
                rows={6}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={cancelEdit}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-semibold hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => (isCreating ? handleCreate() : handleUpdate(editingId!))}
                disabled={saving}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-semibold hover:bg-purple-600 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : isCreating ? 'Create' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Responses List */}
      <div className="space-y-4">
        {responses.map((response) => (
          <div
            key={response.id}
            className="bg-gray-800 border border-gray-700 rounded-xl p-5"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-medium text-white">{response.title}</h4>
                {response.category && (
                  <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded mt-1 inline-block">
                    {response.category}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(response)}
                  className="px-3 py-1 text-xs font-semibold rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500 hover:text-white transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(response.id)}
                  className="px-3 py-1 text-xs font-semibold rounded bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
            <div className="text-sm text-gray-400 whitespace-pre-wrap bg-gray-900 rounded-lg p-3">
              {response.content}
            </div>
          </div>
        ))}

        {responses.length === 0 && !isCreating && (
          <div className="text-center py-12 text-gray-500">
            No canned responses yet. Create one to speed up your support workflow.
          </div>
        )}
      </div>
    </div>
  );
}
