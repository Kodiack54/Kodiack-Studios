'use client';

import { useState } from 'react';
import { RoleGate } from '@/app/settings/RoleGate';
import { useUser } from '@/app/settings/UserContext';
import PatchNotesModal, { PatchNotesData } from '../releases/components/PatchNotesModal';

// Project data with version info
const PROJECTS = [
  { id: 'tradelines', name: 'NextBid Engine', patcher: 7101, devVersion: 'v2.4.1-dev', testVersion: 'v2.4.0', prodVersion: 'v2.3.8' },
  { id: 'sources', name: 'NextSource', patcher: 7102, devVersion: 'v1.2.0-dev', testVersion: 'v1.1.5', prodVersion: 'v1.1.4' },
  { id: 'nextbidder', name: 'NextBidder', patcher: 7103, devVersion: 'v3.0.0-dev', testVersion: 'v2.9.1', prodVersion: 'v2.9.0' },
  { id: 'portals', name: 'NextBid Portal', patcher: 7104, devVersion: 'v4.1.0-dev', testVersion: 'v4.0.3', prodVersion: 'v4.0.2' },
  { id: 'nexttech', name: 'NextTech', patcher: 7105, devVersion: 'v1.0.5-dev', testVersion: 'v1.0.4', prodVersion: 'v1.0.3' },
  { id: 'nexttask', name: 'NextTask', patcher: 7106, devVersion: 'v0.9.0-dev', testVersion: 'v0.8.5', prodVersion: 'v0.8.4' },
  { id: 'dashboard', name: 'Dashboard', patcher: 7500, devVersion: 'v1.0.0-dev', testVersion: 'v0.9.0', prodVersion: 'v0.8.0' },
];

export default function QuickActions() {
  const [showDeployModal, setShowDeployModal] = useState(false);

  return (
    <div className="flex items-center gap-3">
      <RoleGate permission="canPushToTest">
        <button
          onClick={() => setShowDeployModal(true)}
          className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 transition-colors"
        >
          Quick Deploy
        </button>
      </RoleGate>

      {/* Deploy Modal */}
      {showDeployModal && (
        <QuickDeployModal onClose={() => setShowDeployModal(false)} />
      )}
    </div>
  );
}

interface DeployConfig {
  project: string;
  environment: 'development' | 'staging' | 'production';
  branch: string;
}

function QuickDeployModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<'config' | 'patch-notes'>('config');
  const [deploying, setDeploying] = useState(false);
  const { hasPermission } = useUser();
  const canPushToProd = hasPermission('canPushToProd');

  const [formData, setFormData] = useState<DeployConfig>({
    project: '',
    environment: 'staging',
    branch: 'main',
  });

  const selectedProject = PROJECTS.find(p => p.id === formData.project);

  const getVersions = () => {
    if (!selectedProject) return { from: '', to: '' };

    switch (formData.environment) {
      case 'development':
        return { from: 'latest commit', to: selectedProject.devVersion };
      case 'staging':
        return { from: selectedProject.devVersion, to: selectedProject.testVersion };
      case 'production':
        return { from: selectedProject.testVersion, to: selectedProject.prodVersion };
      default:
        return { from: '', to: '' };
    }
  };

  const handleContinue = () => {
    if (!formData.project) {
      alert('Please select a project');
      return;
    }
    setStep('patch-notes');
  };

  const handlePatchNotesSubmit = async (patchNotes: PatchNotesData) => {
    if (formData.environment === 'production') {
      const confirm = window.confirm('Are you sure you want to deploy to PRODUCTION?');
      if (!confirm) return;
    }

    setDeploying(true);

    try {
      const res = await fetch('/api/dev-controls/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          patchNotes,
        }),
      });

      const result = await res.json();

      if (result.success) {
        alert(`Deployment started! ID: ${result.deployment_id}`);
        onClose();
      } else {
        alert(result.error || 'Failed to start deployment');
      }
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setDeploying(false);
    }
  };

  // Step 2: Patch Notes
  if (step === 'patch-notes' && selectedProject) {
    const versions = getVersions();
    return (
      <PatchNotesModal
        project={formData.project}
        projectName={selectedProject.name}
        fromVersion={versions.from}
        toVersion={versions.to}
        targetEnvironment={formData.environment}
        onClose={() => setStep('config')}
        onSubmit={handlePatchNotesSubmit}
      />
    );
  }

  // Step 1: Config
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Quick Deploy</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">&times;</button>
        </div>

        <div className="space-y-4">
          {/* Project Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Project</label>
            <select
              value={formData.project}
              onChange={(e) => setFormData((prev) => ({ ...prev, project: e.target.value }))}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-green-500 focus:outline-none"
            >
              <option value="">Select project...</option>
              {PROJECTS.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.patcher})</option>
              ))}
            </select>
          </div>

          {/* Environment Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Environment</label>
            <select
              value={formData.environment}
              onChange={(e) => setFormData((prev) => ({ ...prev, environment: e.target.value as DeployConfig['environment'] }))}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-green-500 focus:outline-none"
            >
              <option value="development">Development (51XX)</option>
              <option value="staging">Staging / Test (50XX)</option>
              <option value="production" disabled={!canPushToProd}>
                Production {!canPushToProd ? '(Requires approval)' : ''}
              </option>
            </select>
          </div>

          {/* Branch Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Branch</label>
            <input
              type="text"
              value={formData.branch}
              onChange={(e) => setFormData((prev) => ({ ...prev, branch: e.target.value }))}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-green-500 focus:outline-none"
            />
          </div>

          {/* Version Preview */}
          {selectedProject && (
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Version Flow</div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-400 font-mono">{getVersions().from}</span>
                <span className="text-gray-600">→</span>
                <span className="text-white font-mono">{getVersions().to}</span>
              </div>
            </div>
          )}

          {/* Production Warning */}
          {formData.environment === 'production' && (
            <div className="bg-red-500/15 border border-red-500/30 text-red-400 px-3 py-2 rounded-lg text-sm">
              You are deploying to production. Patch notes are required.
            </div>
          )}

          {/* Info about patch notes */}
          <div className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 px-3 py-2 rounded-lg text-sm">
            Patch notes are required before deploying. You'll document changes in the next step.
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
              onClick={handleContinue}
              disabled={!formData.project}
              className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              Continue to Patch Notes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
