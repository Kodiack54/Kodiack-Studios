'use client';

import { useState, useEffect } from 'react';
import { RoleGate } from '@/app/settings/RoleGate';
import { useUser } from '@/app/settings/UserContext';

export interface DevLock {
  id: string;
  project: string;
  projectName: string;
  branch: string;
  lockedBy: string;
  lockedById: string;
  reason: string;
  lockedAt: string;
  expiresAt: string | null;
  isActive: boolean;
}

interface DevLockPanelProps {
  locks: DevLock[];
  onLock: (lock: Omit<DevLock, 'id' | 'lockedAt' | 'isActive'>) => Promise<void>;
  onUnlock: (lockId: string) => Promise<void>;
  onRefresh: () => void;
}

const PROJECTS = [
  { id: 'tradelines', name: 'NextBid Engine' },
  { id: 'sources', name: 'NextSource' },
  { id: 'nextbidder', name: 'NextBidder' },
  { id: 'portals', name: 'NextBid Portal' },
  { id: 'nexttech', name: 'NextTech' },
  { id: 'nexttask', name: 'NextTask' },
  { id: 'dashboard', name: 'Dashboard' },
];

export default function DevLockPanel({ locks, onLock, onUnlock, onRefresh }: DevLockPanelProps) {
  const { user } = useUser();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [unlocking, setUnlocking] = useState<string | null>(null);

  const activeLocks = locks.filter(l => l.isActive);

  const handleUnlock = async (lockId: string) => {
    if (!confirm('Are you sure you want to release this lock?')) return;
    setUnlocking(lockId);
    try {
      await onUnlock(lockId);
      onRefresh();
    } finally {
      setUnlocking(null);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div>
          <h3 className="text-lg font-semibold text-white">Dev Locks</h3>
          <p className="text-sm text-gray-400">
            Lock repos to prevent pulls during active development
          </p>
        </div>
        <RoleGate permission="canPushToTest">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-1.5 bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 rounded-lg text-sm font-semibold hover:bg-yellow-500 hover:text-white transition-colors"
          >
            + Create Lock
          </button>
        </RoleGate>
      </div>

      {/* Active Locks */}
      <div className="p-4">
        {activeLocks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">&#128275;</div>
            <div>No active locks</div>
            <div className="text-sm mt-1">All projects are open for deployment</div>
          </div>
        ) : (
          <div className="space-y-3">
            {activeLocks.map((lock) => (
              <div
                key={lock.id}
                className="bg-gray-900 border border-yellow-500/30 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-400">&#128274;</span>
                      <span className="font-medium text-white">{lock.projectName}</span>
                      <span className="text-xs text-gray-500 font-mono">{lock.branch}</span>
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      Locked by <span className="text-white">{lock.lockedBy}</span> {formatTime(lock.lockedAt)}
                    </div>
                    <div className="text-sm text-yellow-400/80 mt-2">
                      "{lock.reason}"
                    </div>
                    {lock.expiresAt && (
                      <div className="text-xs text-gray-500 mt-2">
                        Auto-expires: {new Date(lock.expiresAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                  {(user?.id === lock.lockedById || user?.role === 'admin' || user?.role === 'lead') && (
                    <button
                      onClick={() => handleUnlock(lock.id)}
                      disabled={unlocking === lock.id}
                      className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-xs font-semibold hover:bg-gray-600 transition-colors disabled:opacity-50"
                    >
                      {unlocking === lock.id ? 'Releasing...' : 'Release'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Lock Modal */}
      {showCreateModal && (
        <CreateLockModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={async (lock) => {
            await onLock(lock);
            setShowCreateModal(false);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

interface CreateLockModalProps {
  onClose: () => void;
  onSubmit: (lock: Omit<DevLock, 'id' | 'lockedAt' | 'isActive'>) => Promise<void>;
}

function CreateLockModal({ onClose, onSubmit }: CreateLockModalProps) {
  const { user } = useUser();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    project: '',
    branch: 'main',
    reason: '',
    duration: '4h' as '1h' | '4h' | '8h' | '24h' | 'indefinite',
  });

  const getDurationMs = (duration: string): number | null => {
    switch (duration) {
      case '1h': return 60 * 60 * 1000;
      case '4h': return 4 * 60 * 60 * 1000;
      case '8h': return 8 * 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      case 'indefinite': return null;
      default: return 4 * 60 * 60 * 1000;
    }
  };

  const handleSubmit = async () => {
    if (!formData.project) {
      alert('Please select a project');
      return;
    }
    if (!formData.reason.trim()) {
      alert('Please provide a reason for the lock');
      return;
    }

    setSubmitting(true);
    try {
      const durationMs = getDurationMs(formData.duration);
      const selectedProject = PROJECTS.find(p => p.id === formData.project);

      await onSubmit({
        project: formData.project,
        projectName: selectedProject?.name || formData.project,
        branch: formData.branch,
        lockedBy: user?.name || 'Unknown',
        lockedById: user?.id || '',
        reason: formData.reason,
        expiresAt: durationMs ? new Date(Date.now() + durationMs).toISOString() : null,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Create Dev Lock</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">&times;</button>
        </div>

        <div className="space-y-4">
          {/* Project */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Project</label>
            <select
              value={formData.project}
              onChange={(e) => setFormData(prev => ({ ...prev, project: e.target.value }))}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-yellow-500 focus:outline-none"
            >
              <option value="">Select project...</option>
              {PROJECTS.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Branch */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Branch</label>
            <input
              type="text"
              value={formData.branch}
              onChange={(e) => setFormData(prev => ({ ...prev, branch: e.target.value }))}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-yellow-500 focus:outline-none"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Reason <span className="text-red-400">*</span>
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="e.g., Implementing new authentication flow..."
              rows={2}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none resize-none"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Duration</label>
            <div className="grid grid-cols-5 gap-2">
              {(['1h', '4h', '8h', '24h', 'indefinite'] as const).map((duration) => (
                <button
                  key={duration}
                  onClick={() => setFormData(prev => ({ ...prev, duration }))}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    formData.duration === duration
                      ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
                      : 'bg-gray-900 text-gray-400 border border-gray-700 hover:border-gray-600'
                  }`}
                >
                  {duration === 'indefinite' ? '∞' : duration}
                </button>
              ))}
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-3 py-2 rounded-lg text-sm">
            This will block git pulls on this project until the lock is released.
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-semibold hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !formData.project || !formData.reason.trim()}
              className="flex-1 px-4 py-2 bg-yellow-500 text-black rounded-lg text-sm font-semibold hover:bg-yellow-400 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Lock'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
