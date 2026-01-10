'use client';

import { useState } from 'react';
import { StudioService, ServiceStatus, STATUS_COLORS } from '../config';
import { ServiceHealth } from '../lib/types';
// Import from git-database - single source of truth
import GitDetailsModal from '@/app/git-database/components/GitDetailsModal';

interface ServiceCardProps {
  service: StudioService;
  health?: ServiceHealth;
  isSelected: boolean;
  onClick: () => void;
}

export default function ServiceCard({
  service,
  health,
  isSelected,
  onClick,
}: ServiceCardProps) {
  const [showGitModal, setShowGitModal] = useState(false);
  const status = health?.status || 'unknown';
  const cpu = health?.cpu || 0;
  const memoryMB = (health?.memory || 0) / (1024 * 1024);

  // Git drift status from health data (populated by health API)
  const gitStatus = health?.gitDriftStatus || 'gray';

  // Status-based border color
  const statusBorders: Record<ServiceStatus, string> = {
    online: 'border-green-500 bg-green-500/10',
    degraded: 'border-yellow-500 bg-yellow-500/10',
    offline: 'border-red-500 bg-red-500/10',
    unknown: 'border-gray-500 bg-gray-500/10',
  };

  const selectedClass = isSelected
    ? 'ring-2 ring-blue-500 bg-blue-500/20'
    : 'hover:bg-gray-700/50';

  // Type badge colors
  const typeBadgeColors: Record<string, string> = {
    pc_emitter: 'bg-purple-600',
    hub: 'bg-blue-600',
    ai: 'bg-cyan-600',
    ui: 'bg-green-600',
    gateway: 'bg-orange-600',
  };

  // Git tracker button colors
  const gitTrackerColors: Record<string, string> = {
    green: 'bg-green-600 hover:bg-green-500 text-white',
    orange: 'bg-orange-600 hover:bg-orange-500 text-white',
    red: 'bg-red-600 hover:bg-red-500 text-white',
    gray: 'bg-gray-600 hover:bg-gray-500 text-gray-300',
  };

  const handleGitClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowGitModal(true);
  };

  return (
    <>
      <div
        onClick={onClick}
        className={`flex items-center gap-4 px-4 py-3 cursor-pointer border-l-4 transition-all ${statusBorders[status]} ${selectedClass}`}
      >
        {/* Port & Name */}
        <div className="w-36 flex-shrink-0">
          <div className="font-mono text-sm text-white font-bold">
            {service.port || '—'}
          </div>
          <div className="text-xs text-gray-400 truncate">{service.label}</div>
        </div>

        {/* Status Dot */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: STATUS_COLORS[status] }}
            title={`Status: ${status}`}
          />
        </div>

        {/* Type Badge */}
        <div className="flex-shrink-0">
          <span
            className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded ${typeBadgeColors[service.type] || 'bg-gray-600'} text-white`}
          >
            {service.type.replace('_', ' ')}
          </span>
        </div>

        {/* Description + Tailer Warning */}
        <div className="flex-1 text-xs truncate">
          {health?.tailerWarning ? (
            <span className="text-yellow-400" title={health.tailerWarning}>
              {health.tailerWarning}
            </span>
          ) : (
            <span className="text-gray-400">{service.description}</span>
          )}
        </div>

        {/* Resource Bars (if available) */}
        {(cpu > 0 || memoryMB > 0) && (
          <div className="flex items-center gap-3">
            {/* CPU */}
            <div className="flex items-center gap-1.5 w-20">
              <span className="text-[10px] text-gray-500 w-7">CPU</span>
              <div className="flex-1 h-2 bg-gray-700 rounded overflow-hidden">
                <div
                  className={`h-full transition-all ${cpu > 80 ? 'bg-red-500' : cpu > 50 ? 'bg-yellow-500' : 'bg-cyan-500'}`}
                  style={{ width: `${Math.min(cpu, 100)}%` }}
                />
              </div>
            </div>

            {/* Memory */}
            <div className="flex items-center gap-1.5 w-20">
              <span className="text-[10px] text-gray-500 w-7">MEM</span>
              <div className="flex-1 h-2 bg-gray-700 rounded overflow-hidden">
                <div
                  className={`h-full transition-all ${memoryMB > 400 ? 'bg-red-500' : memoryMB > 200 ? 'bg-yellow-500' : 'bg-cyan-500'}`}
                  style={{ width: `${Math.min((memoryMB / 512) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Git Tracker Button - Large & Obvious */}
        <button
          onClick={handleGitClick}
          className={`flex-shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${gitTrackerColors[gitStatus]}`}
          title="View git sync status"
        >
          Git Tracker
        </button>
      </div>

      {/* Git Details Modal - imported from git-database */}
      {showGitModal && (
        <GitDetailsModal
          repoName={service.repoSlug || service.pm2Name || service.id}
          isOpen={showGitModal}
          onClose={() => setShowGitModal(false)}
        />
      )}
    </>
  );
}
