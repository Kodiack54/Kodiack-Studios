'use client';

import { useState } from 'react';
import { RoleGate } from '@/app/settings/RoleGate';
import { useUser } from '@/app/settings/UserContext';

interface PatchNotesModalProps {
  project: string;
  projectName: string;
  fromVersion: string;
  toVersion: string;
  targetEnvironment: 'development' | 'staging' | 'production';
  onClose: () => void;
  onSubmit: (patchNotes: PatchNotesData) => void;
}

export interface PatchNotesData {
  title: string;
  description: string;
  changes: string[];
  riskLevel: 'low' | 'medium' | 'high';
  rollbackPlan: string;
  breakingChanges: boolean;
  requiresDbMigration: boolean;
  testedOn: string[];
  approvedBy?: string;
}

const CHANGE_TYPES = [
  { value: 'feature', label: 'New Feature', icon: '✨' },
  { value: 'bugfix', label: 'Bug Fix', icon: '🐛' },
  { value: 'refactor', label: 'Refactoring', icon: '♻️' },
  { value: 'performance', label: 'Performance', icon: '⚡' },
  { value: 'security', label: 'Security', icon: '🔒' },
  { value: 'config', label: 'Config Change', icon: '⚙️' },
  { value: 'dependency', label: 'Dependency Update', icon: '📦' },
];

export default function PatchNotesModal({
  project,
  projectName,
  fromVersion,
  toVersion,
  targetEnvironment,
  onClose,
  onSubmit,
}: PatchNotesModalProps) {
  const { user, hasPermission } = useUser();
  const canPushToProd = hasPermission('canPushToProd');

  const [formData, setFormData] = useState<PatchNotesData>({
    title: '',
    description: '',
    changes: [],
    riskLevel: 'low',
    rollbackPlan: '',
    breakingChanges: false,
    requiresDbMigration: false,
    testedOn: [],
  });

  const [newChange, setNewChange] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const addChange = () => {
    if (newChange.trim()) {
      setFormData(prev => ({
        ...prev,
        changes: [...prev.changes, newChange.trim()]
      }));
      setNewChange('');
    }
  };

  const removeChange = (index: number) => {
    setFormData(prev => ({
      ...prev,
      changes: prev.changes.filter((_, i) => i !== index)
    }));
  };

  const toggleTestedOn = (env: string) => {
    setFormData(prev => ({
      ...prev,
      testedOn: prev.testedOn.includes(env)
        ? prev.testedOn.filter(e => e !== env)
        : [...prev.testedOn, env]
    }));
  };

  const validate = (): boolean => {
    const newErrors: string[] = [];

    if (!formData.title.trim()) {
      newErrors.push('Title is required');
    }

    if (!formData.description.trim()) {
      newErrors.push('Description is required');
    }

    if (formData.changes.length === 0) {
      newErrors.push('At least one change must be listed');
    }

    if (!formData.rollbackPlan.trim()) {
      newErrors.push('Rollback plan is required');
    }

    if (targetEnvironment === 'production') {
      if (!formData.testedOn.includes('staging')) {
        newErrors.push('Must be tested on staging before production deploy');
      }
      if (formData.riskLevel === 'high' && !canPushToProd) {
        newErrors.push('High-risk production deploys require Lead/Admin approval');
      }
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        approvedBy: targetEnvironment === 'production' ? user?.name : undefined
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-400 border-green-500/30 bg-green-500/10';
      case 'medium': return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
      case 'high': return 'text-red-400 border-red-500/30 bg-red-500/10';
      default: return 'text-gray-400 border-gray-700 bg-gray-800';
    }
  };

  const getEnvColor = (env: string) => {
    switch (env) {
      case 'development': return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'staging': return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
      case 'production': return 'bg-red-500/15 text-red-400 border-red-500/30';
      default: return 'bg-gray-700 text-gray-400 border-gray-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-white">Patch Notes Required</h3>
            <p className="text-sm text-gray-400 mt-1">
              Document changes before deploying to {targetEnvironment}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Deploy Info Banner */}
          <div className={`rounded-lg p-4 border ${getEnvColor(targetEnvironment)}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{projectName}</div>
                <div className="text-sm opacity-80">
                  {fromVersion} → {toVersion}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-wider opacity-60">Target</div>
                <div className="font-semibold capitalize">{targetEnvironment}</div>
              </div>
            </div>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-500/15 border border-red-500/30 rounded-lg p-4">
              <div className="text-red-400 font-medium mb-2">Please fix the following:</div>
              <ul className="list-disc list-inside text-sm text-red-300 space-y-1">
                {errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Patch Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Fix SAM authentication timeout"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what this patch does and why it's needed..."
              rows={3}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none resize-none"
            />
          </div>

          {/* Changes List */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Changes <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newChange}
                onChange={(e) => setNewChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addChange())}
                placeholder="Add a change (press Enter)"
                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
              />
              <button
                onClick={addChange}
                className="px-4 py-2 bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500 hover:text-white transition-colors"
              >
                Add
              </button>
            </div>
            {formData.changes.length > 0 && (
              <ul className="space-y-2">
                {formData.changes.map((change, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2"
                  >
                    <span className="text-cyan-400">•</span>
                    <span className="flex-1 text-white text-sm">{change}</span>
                    <button
                      onClick={() => removeChange(index)}
                      className="text-gray-500 hover:text-red-400 transition-colors"
                    >
                      &times;
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Risk Level */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Risk Level <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['low', 'medium', 'high'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setFormData(prev => ({ ...prev, riskLevel: level }))}
                  className={`px-4 py-3 rounded-lg border text-sm font-medium capitalize transition-colors ${
                    formData.riskLevel === level
                      ? getRiskColor(level)
                      : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  {level === 'low' && '✓ '}
                  {level === 'medium' && '⚠ '}
                  {level === 'high' && '⚠️ '}
                  {level}
                </button>
              ))}
            </div>
            {formData.riskLevel === 'high' && (
              <p className="text-sm text-yellow-400 mt-2">
                High-risk deploys require additional review and approval.
              </p>
            )}
          </div>

          {/* Flags */}
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-3 bg-gray-900 border border-gray-700 rounded-lg p-3 cursor-pointer hover:border-gray-600 transition-colors">
              <input
                type="checkbox"
                checked={formData.breakingChanges}
                onChange={(e) => setFormData(prev => ({ ...prev, breakingChanges: e.target.checked }))}
                className="w-4 h-4 rounded bg-gray-800 border-gray-600 text-cyan-500 focus:ring-cyan-500"
              />
              <div>
                <div className="text-sm font-medium text-white">Breaking Changes</div>
                <div className="text-xs text-gray-500">API or behavior changes</div>
              </div>
            </label>
            <label className="flex items-center gap-3 bg-gray-900 border border-gray-700 rounded-lg p-3 cursor-pointer hover:border-gray-600 transition-colors">
              <input
                type="checkbox"
                checked={formData.requiresDbMigration}
                onChange={(e) => setFormData(prev => ({ ...prev, requiresDbMigration: e.target.checked }))}
                className="w-4 h-4 rounded bg-gray-800 border-gray-600 text-cyan-500 focus:ring-cyan-500"
              />
              <div>
                <div className="text-sm font-medium text-white">DB Migration</div>
                <div className="text-xs text-gray-500">Schema changes needed</div>
              </div>
            </label>
          </div>

          {/* Tested On */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Tested On {targetEnvironment === 'production' && <span className="text-red-400">*</span>}
            </label>
            <div className="flex gap-3">
              {['development', 'staging'].map((env) => (
                <button
                  key={env}
                  onClick={() => toggleTestedOn(env)}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium capitalize transition-colors ${
                    formData.testedOn.includes(env)
                      ? getEnvColor(env)
                      : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  {formData.testedOn.includes(env) ? '✓ ' : ''}{env}
                </button>
              ))}
            </div>
          </div>

          {/* Rollback Plan */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Rollback Plan <span className="text-red-400">*</span>
            </label>
            <textarea
              value={formData.rollbackPlan}
              onChange={(e) => setFormData(prev => ({ ...prev, rollbackPlan: e.target.value }))}
              placeholder="Describe how to rollback if something goes wrong..."
              rows={3}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none resize-none"
            />
          </div>

          {/* Production Warning */}
          {targetEnvironment === 'production' && (
            <div className="bg-red-500/15 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
              <div className="font-medium">Production Deploy</div>
              <div className="text-sm mt-1">
                This will affect live users. Ensure all changes have been tested on staging.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 p-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-semibold hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm font-semibold hover:bg-cyan-600 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit & Deploy'}
          </button>
        </div>
      </div>
    </div>
  );
}
