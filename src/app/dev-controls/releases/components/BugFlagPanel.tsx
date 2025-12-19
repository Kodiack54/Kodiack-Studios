'use client';

import { useState } from 'react';
import { RoleGate } from '@/app/settings/RoleGate';
import { useUser } from '@/app/settings/UserContext';

export interface BugFlag {
  id: string;
  project: string;
  projectName: string;
  version: string;
  severity: 'blocker' | 'critical' | 'major';
  title: string;
  description: string;
  flaggedBy: string;
  flaggedById: string;
  linkedTicketId?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt: string;
}

interface BugFlagPanelProps {
  flags: BugFlag[];
  onFlag: (flag: Omit<BugFlag, 'id' | 'createdAt' | 'resolvedAt' | 'resolvedBy'>) => Promise<void>;
  onResolve: (flagId: string) => Promise<void>;
  onRefresh: () => void;
}

const PROJECTS = [
  { id: 'tradelines', name: 'NextBid Engine', currentVersion: 'v2.4.0' },
  { id: 'sources', name: 'NextSource', currentVersion: 'v1.1.5' },
  { id: 'nextbidder', name: 'NextBidder', currentVersion: 'v2.9.1' },
  { id: 'portals', name: 'NextBid Portal', currentVersion: 'v4.0.3' },
  { id: 'nexttech', name: 'NextTech', currentVersion: 'v1.0.4' },
  { id: 'nexttask', name: 'NextTask', currentVersion: 'v0.8.5' },
  { id: 'dashboard', name: 'Dashboard', currentVersion: 'v0.9.0' },
];

const SEVERITY_CONFIG = {
  blocker: {
    label: 'Blocker',
    color: 'bg-red-500/15 text-red-400 border-red-500/30',
    icon: '!!!',
    description: 'Completely blocks deployment',
  },
  critical: {
    label: 'Critical',
    color: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    icon: '!!',
    description: 'Major functionality broken',
  },
  major: {
    label: 'Major',
    color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    icon: '!',
    description: 'Significant issue needs fix',
  },
};

export default function BugFlagPanel({ flags, onFlag, onResolve, onRefresh }: BugFlagPanelProps) {
  const { user } = useUser();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);

  const activeFlags = flags.filter(f => !f.resolvedAt);
  const blockerCount = activeFlags.filter(f => f.severity === 'blocker').length;

  const handleResolve = async (flagId: string) => {
    if (!confirm('Are you sure this bug has been fixed and verified?')) return;
    setResolving(flagId);
    try {
      await onResolve(flagId);
      onRefresh();
    } finally {
      setResolving(null);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-white">Bug Flags</h3>
            {blockerCount > 0 && (
              <span className="px-2 py-0.5 bg-red-500/15 text-red-400 border border-red-500/30 rounded text-xs font-semibold">
                {blockerCount} blocker{blockerCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400">
            Flag bugs to block promotion to production
          </p>
        </div>
        <RoleGate permission="canPushToTest">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-1.5 bg-red-500/15 text-red-400 border border-red-500/30 rounded-lg text-sm font-semibold hover:bg-red-500 hover:text-white transition-colors"
          >
            + Flag Bug
          </button>
        </RoleGate>
      </div>

      {/* Active Flags */}
      <div className="p-4">
        {activeFlags.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">&#10004;</div>
            <div>No active bug flags</div>
            <div className="text-sm mt-1">All projects clear for production</div>
          </div>
        ) : (
          <div className="space-y-3">
            {activeFlags.map((flag) => {
              const severity = SEVERITY_CONFIG[flag.severity];
              return (
                <div
                  key={flag.id}
                  className={`bg-gray-900 border rounded-lg p-4 ${severity.color.split(' ')[2]}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${severity.color}`}>
                          {severity.icon} {severity.label}
                        </span>
                        <span className="font-medium text-white">{flag.projectName}</span>
                        <span className="text-xs text-gray-500 font-mono">{flag.version}</span>
                      </div>
                      <div className="text-white mt-2 font-medium">{flag.title}</div>
                      {flag.description && (
                        <div className="text-sm text-gray-400 mt-1">{flag.description}</div>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                        <span>Flagged by {flag.flaggedBy}</span>
                        <span>{formatTime(flag.createdAt)}</span>
                        {flag.linkedTicketId && (
                          <span className="text-cyan-400">Ticket #{flag.linkedTicketId.slice(0, 8)}</span>
                        )}
                      </div>
                    </div>
                    <RoleGate permission="canPushToTest">
                      <button
                        onClick={() => handleResolve(flag.id)}
                        disabled={resolving === flag.id}
                        className="px-3 py-1.5 bg-green-500/15 text-green-400 border border-green-500/30 rounded-lg text-xs font-semibold hover:bg-green-500 hover:text-white transition-colors disabled:opacity-50"
                      >
                        {resolving === flag.id ? 'Resolving...' : 'Mark Resolved'}
                      </button>
                    </RoleGate>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Warning if blockers exist */}
      {blockerCount > 0 && (
        <div className="mx-4 mb-4 bg-red-500/15 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
          <div className="font-medium">Production Deploys Blocked</div>
          <div className="text-sm mt-1">
            {blockerCount} blocker bug{blockerCount > 1 ? 's' : ''} must be resolved before deploying to production.
          </div>
        </div>
      )}

      {/* Create Flag Modal */}
      {showCreateModal && (
        <CreateFlagModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={async (flag) => {
            await onFlag(flag);
            setShowCreateModal(false);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

interface CreateFlagModalProps {
  onClose: () => void;
  onSubmit: (flag: Omit<BugFlag, 'id' | 'createdAt' | 'resolvedAt' | 'resolvedBy'>) => Promise<void>;
}

function CreateFlagModal({ onClose, onSubmit }: CreateFlagModalProps) {
  const { user } = useUser();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    project: '',
    version: '',
    severity: 'major' as 'blocker' | 'critical' | 'major',
    title: '',
    description: '',
    linkedTicketId: '',
  });

  const selectedProject = PROJECTS.find(p => p.id === formData.project);

  // Auto-fill version when project is selected
  const handleProjectChange = (projectId: string) => {
    const project = PROJECTS.find(p => p.id === projectId);
    setFormData(prev => ({
      ...prev,
      project: projectId,
      version: project?.currentVersion || '',
    }));
  };

  const handleSubmit = async () => {
    if (!formData.project) {
      alert('Please select a project');
      return;
    }
    if (!formData.title.trim()) {
      alert('Please provide a bug title');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        project: formData.project,
        projectName: selectedProject?.name || formData.project,
        version: formData.version,
        severity: formData.severity,
        title: formData.title,
        description: formData.description,
        flaggedBy: user?.name || 'Unknown',
        flaggedById: user?.id || '',
        linkedTicketId: formData.linkedTicketId || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Flag Bug</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">&times;</button>
        </div>

        <div className="space-y-4">
          {/* Project */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Project</label>
            <select
              value={formData.project}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-red-500 focus:outline-none"
            >
              <option value="">Select project...</option>
              {PROJECTS.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Version */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Version</label>
            <input
              type="text"
              value={formData.version}
              onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
              placeholder="e.g., v2.4.0 or commit hash"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
            />
          </div>

          {/* Severity */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Severity</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(SEVERITY_CONFIG) as [keyof typeof SEVERITY_CONFIG, typeof SEVERITY_CONFIG[keyof typeof SEVERITY_CONFIG]][]).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setFormData(prev => ({ ...prev, severity: key }))}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    formData.severity === key
                      ? config.color
                      : 'bg-gray-900 text-gray-400 border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="font-bold">{config.icon} {config.label}</div>
                  <div className="text-xs opacity-70 mt-0.5">{config.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Bug Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., SAM authentication fails after timeout"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the bug and how to reproduce it..."
              rows={3}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none resize-none"
            />
          </div>

          {/* Linked Ticket */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Link to Ticket (optional)</label>
            <input
              type="text"
              value={formData.linkedTicketId}
              onChange={(e) => setFormData(prev => ({ ...prev, linkedTicketId: e.target.value }))}
              placeholder="Ticket ID or URL"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
            />
          </div>

          {/* Blocker Warning */}
          {formData.severity === 'blocker' && (
            <div className="bg-red-500/15 border border-red-500/30 text-red-400 px-3 py-2 rounded-lg text-sm">
              Blocker flags completely block production deployments for this project.
            </div>
          )}

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
              disabled={submitting || !formData.project || !formData.title.trim()}
              className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Flagging...' : 'Flag Bug'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
