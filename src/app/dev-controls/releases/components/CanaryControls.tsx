'use client';

import { useState } from 'react';
import { RoleGate } from '@/app/settings/RoleGate';
import { useUser } from '@/app/settings/UserContext';

export interface CanaryDeployment {
  id: string;
  project: string;
  projectName: string;
  version: string;
  targetEnvironment: 'staging' | 'production';
  currentScope: number; // 1, 5, 20, -1 (all)
  targetSlots: string[];
  deployedSlots: string[];
  status: 'pending' | 'deploying' | 'monitoring' | 'expanding' | 'complete' | 'failed' | 'rolled_back';
  healthScore: number; // 0-100
  errorRate: number; // 0-100
  startedAt: string;
  expandedAt: string[];
  deployedBy: string;
}

interface CanaryControlsProps {
  deployment: CanaryDeployment | null;
  onExpand: (deploymentId: string, newScope: number) => Promise<void>;
  onRollback: (deploymentId: string) => Promise<void>;
  onComplete: (deploymentId: string) => Promise<void>;
}

const CANARY_STAGES = [
  { scope: 1, label: 'Canary', slots: 1, description: 'Single tradeline test' },
  { scope: 5, label: 'Limited', slots: 5, description: '25% of tradelines' },
  { scope: 20, label: 'Wide', slots: 20, description: 'All tradelines' },
  { scope: -1, label: 'Full', slots: -1, description: 'Complete rollout' },
];

const TRADELINE_SLOTS = [
  { id: '01', name: 'security', port: 31001 },
  { id: '02', name: 'administrative', port: 31002 },
  { id: '03', name: 'facilities', port: 31003 },
  { id: '04', name: 'logistics', port: 31004 },
  { id: '05', name: 'electrical', port: 31005 },
  { id: '06', name: 'lowvoltage', port: 31006 },
  { id: '07', name: 'landscaping', port: 31007 },
  { id: '08', name: 'hvac', port: 31008 },
  { id: '09', name: 'plumbing', port: 31009 },
  { id: '10', name: 'janitorial', port: 31010 },
  { id: '11', name: 'support', port: 31011 },
  { id: '12', name: 'waste', port: 31012 },
  { id: '13', name: 'construction', port: 31013 },
  { id: '14', name: 'roofing', port: 31014 },
  { id: '15', name: 'painting', port: 31015 },
  { id: '16', name: 'flooring', port: 31016 },
  { id: '17', name: 'demolition', port: 31017 },
  { id: '18', name: 'environmental', port: 31018 },
  { id: '19', name: 'concrete', port: 31019 },
  { id: '20', name: 'fencing', port: 31020 },
];

export default function CanaryControls({ deployment, onExpand, onRollback, onComplete }: CanaryControlsProps) {
  const { hasPermission } = useUser();
  const canPushToProd = hasPermission('canPushToProd');
  const [expanding, setExpanding] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);

  if (!deployment) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-2">Canary Deployment</h3>
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">&#127918;</div>
          <div>No active canary deployment</div>
          <div className="text-sm mt-1">Start a deployment to enable canary controls</div>
        </div>
      </div>
    );
  }

  const currentStage = CANARY_STAGES.find(s => s.scope === deployment.currentScope) || CANARY_STAGES[0];
  const currentStageIndex = CANARY_STAGES.findIndex(s => s.scope === deployment.currentScope);
  const nextStage = CANARY_STAGES[currentStageIndex + 1];
  const isComplete = deployment.status === 'complete';
  const isFailed = deployment.status === 'failed' || deployment.status === 'rolled_back';
  const canExpand = deployment.status === 'monitoring' && nextStage && deployment.healthScore >= 95;

  const handleExpand = async () => {
    if (!nextStage || !canExpand) return;
    setExpanding(true);
    try {
      await onExpand(deployment.id, nextStage.scope);
    } finally {
      setExpanding(false);
    }
  };

  const handleRollback = async () => {
    if (!confirm('Are you sure you want to rollback this deployment? This will revert all deployed slots.')) return;
    setRollingBack(true);
    try {
      await onRollback(deployment.id);
    } finally {
      setRollingBack(false);
    }
  };

  const handleComplete = async () => {
    if (!confirm('Mark this canary deployment as complete?')) return;
    await onComplete(deployment.id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-gray-400';
      case 'deploying': return 'text-blue-400';
      case 'monitoring': return 'text-cyan-400';
      case 'expanding': return 'text-blue-400';
      case 'complete': return 'text-green-400';
      case 'failed': return 'text-red-400';
      case 'rolled_back': return 'text-orange-400';
      default: return 'text-gray-400';
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 95) return 'text-green-400 bg-green-500/15';
    if (score >= 80) return 'text-yellow-400 bg-yellow-500/15';
    return 'text-red-400 bg-red-500/15';
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Canary Deployment</h3>
            <p className="text-sm text-gray-400">
              {deployment.projectName} {deployment.version}
            </p>
          </div>
          <div className={`px-3 py-1 rounded-lg text-sm font-semibold capitalize ${getStatusColor(deployment.status)}`}>
            {deployment.status.replace('_', ' ')}
          </div>
        </div>
      </div>

      {/* Progress Stages */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          {CANARY_STAGES.map((stage, index) => {
            const isPast = index < currentStageIndex;
            const isCurrent = index === currentStageIndex;
            const isFuture = index > currentStageIndex;

            return (
              <div key={stage.scope} className="flex-1 flex items-center">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                      isPast
                        ? 'bg-green-500/20 border-green-500 text-green-400'
                        : isCurrent
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                        : 'bg-gray-900 border-gray-700 text-gray-500'
                    }`}
                  >
                    {isPast ? '&#10003;' : stage.slots === -1 ? '∞' : stage.slots}
                  </div>
                  <div className={`text-xs mt-2 font-medium ${isCurrent ? 'text-cyan-400' : isPast ? 'text-green-400' : 'text-gray-500'}`}>
                    {stage.label}
                  </div>
                  <div className="text-xs text-gray-600">{stage.description}</div>
                </div>
                {index < CANARY_STAGES.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-2 ${isPast ? 'bg-green-500' : 'bg-gray-700'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Health Metrics */}
      <div className="p-4 border-b border-gray-700">
        <div className="grid grid-cols-2 gap-4">
          <div className={`rounded-lg p-4 ${getHealthColor(deployment.healthScore)}`}>
            <div className="text-xs uppercase tracking-wider opacity-60">Health Score</div>
            <div className="text-3xl font-bold mt-1">{deployment.healthScore}%</div>
            <div className="text-xs mt-1">
              {deployment.healthScore >= 95 ? 'Healthy' : deployment.healthScore >= 80 ? 'Degraded' : 'Critical'}
            </div>
          </div>
          <div className={`rounded-lg p-4 ${deployment.errorRate <= 1 ? 'text-green-400 bg-green-500/15' : deployment.errorRate <= 5 ? 'text-yellow-400 bg-yellow-500/15' : 'text-red-400 bg-red-500/15'}`}>
            <div className="text-xs uppercase tracking-wider opacity-60">Error Rate</div>
            <div className="text-3xl font-bold mt-1">{deployment.errorRate.toFixed(1)}%</div>
            <div className="text-xs mt-1">
              {deployment.errorRate <= 1 ? 'Normal' : deployment.errorRate <= 5 ? 'Elevated' : 'High'}
            </div>
          </div>
        </div>
      </div>

      {/* Deployed Slots */}
      <div className="p-4 border-b border-gray-700">
        <div className="text-sm font-medium text-gray-400 mb-3">
          Deployed Slots ({deployment.deployedSlots.length}/{deployment.currentScope === -1 ? 20 : deployment.currentScope})
        </div>
        <div className="grid grid-cols-10 gap-2">
          {TRADELINE_SLOTS.map((slot) => {
            const isDeployed = deployment.deployedSlots.includes(slot.id);
            const isTarget = deployment.targetSlots.includes(slot.id);

            return (
              <div
                key={slot.id}
                className={`aspect-square rounded flex items-center justify-center text-xs font-mono ${
                  isDeployed
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : isTarget
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-gray-900 text-gray-600 border border-gray-700'
                }`}
                title={`${slot.name} (${slot.port})`}
              >
                {slot.id}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500/20 border border-green-500/30" />
            <span className="text-gray-500">Deployed</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500/30" />
            <span className="text-gray-500">Target</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-gray-900 border border-gray-700" />
            <span className="text-gray-500">Pending</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      {!isComplete && !isFailed && (
        <div className="p-4">
          <div className="flex gap-3">
            <button
              onClick={handleRollback}
              disabled={rollingBack}
              className="flex-1 px-4 py-2 bg-red-500/15 text-red-400 border border-red-500/30 rounded-lg text-sm font-semibold hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
            >
              {rollingBack ? 'Rolling back...' : 'Rollback'}
            </button>

            {nextStage ? (
              <RoleGate permission={deployment.targetEnvironment === 'production' ? 'canPushToProd' : 'canPushToTest'}>
                <button
                  onClick={handleExpand}
                  disabled={!canExpand || expanding}
                  className="flex-1 px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm font-semibold hover:bg-cyan-600 transition-colors disabled:opacity-50"
                >
                  {expanding ? 'Expanding...' : `Expand to ${nextStage.label} (${nextStage.slots === -1 ? 'All' : nextStage.slots})`}
                </button>
              </RoleGate>
            ) : (
              <RoleGate permission="canPushToProd">
                <button
                  onClick={handleComplete}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 transition-colors"
                >
                  Complete Deployment
                </button>
              </RoleGate>
            )}
          </div>

          {!canExpand && deployment.status === 'monitoring' && nextStage && (
            <div className="mt-3 text-sm text-yellow-400 text-center">
              Health score must be 95%+ to expand. Current: {deployment.healthScore}%
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="p-4 bg-gray-900 rounded-b-xl">
        <div className="text-xs font-medium text-gray-400 mb-2">Timeline</div>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">Started</span>
            <span className="text-gray-400">{new Date(deployment.startedAt).toLocaleString()}</span>
          </div>
          {deployment.expandedAt.map((timestamp, i) => (
            <div key={i} className="flex justify-between">
              <span className="text-gray-500">Expanded to {CANARY_STAGES[i + 1]?.label}</span>
              <span className="text-gray-400">{new Date(timestamp).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
