'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

// Server status types (same as ServerStatusIndicator)
type ServerHealth = 'healthy' | 'degraded' | 'critical' | 'offline' | 'unknown';

interface SlotStatus {
  slotId: string;
  tradeline: string;
  mainPort: number;
  health: ServerHealth;
}

interface ProjectStatus {
  id: string;
  name: string;
  patcherPort: number;
  prodPort: string;
  slots?: SlotStatus[];
  health: ServerHealth;
}

export default function ProductionStatusDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectStatus[]>([]);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function fetchHealth() {
    try {
      const res = await fetch('/api/servers/health');
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (e) {
      console.error('Failed to fetch health:', e);
    } finally {
      setLoading(false);
    }
  }

  // Calculate overall status
  const getOverallStatus = (): ServerHealth => {
    if (projects.length === 0) return 'offline';
    const hasCritical = projects.some(p => p.health === 'critical');
    const hasOffline = projects.some(p => p.health === 'offline');
    const hasDegraded = projects.some(p => p.health === 'degraded');
    if (hasCritical || hasOffline) return 'critical';
    if (hasDegraded) return 'degraded';
    return 'healthy';
  };

  const overallStatus = getOverallStatus();

  const getHealthColor = (health: ServerHealth) => {
    switch (health) {
      case 'healthy': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-600';
    }
  };

  const hasExpandableSlots = (project: ProjectStatus) => {
    return project.slots && project.slots.length > 0;
  };

  const handleProjectClick = (project: ProjectStatus) => {
    if (hasExpandableSlots(project)) {
      setExpandedProject(expandedProject === project.id ? null : project.id);
    }
  };

  const getAllSlots = (project: ProjectStatus) => {
    if (!project.slots) return [];
    return [...project.slots].sort((a, b) => a.slotId.localeCompare(b.slotId));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/20 hover:bg-black/30 border border-black/30 transition-colors"
      >
        <div className={`w-2.5 h-2.5 rounded-full ${getHealthColor(overallStatus)} ${overallStatus === 'healthy' ? 'animate-pulse' : ''}`} />
        <span className="text-white text-sm font-medium">Production Status</span>
        <ChevronDown className={`w-4 h-4 text-white/70 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Projects List - exact same as sidebar */}
          <div className="py-2 max-h-96 overflow-y-auto">
            {projects.map((project) => {
              const allSlots = getAllSlots(project);
              const canExpand = allSlots.length > 0;
              const isExpanded = expandedProject === project.id;

              return (
                <div key={project.id}>
                  <button
                    onClick={() => handleProjectClick(project)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-all hover:bg-gray-800/50`}
                  >
                    {/* Status Dot */}
                    <div className={`w-2 h-2 rounded-full ${getHealthColor(project.health)} ${
                      project.health === 'critical' ? 'animate-pulse' : ''
                    }`} />

                    {/* Project Name */}
                    <span className={`flex-1 text-left ${
                      project.health === 'critical' ? 'text-red-400' :
                      project.health === 'degraded' ? 'text-yellow-400' :
                      'text-gray-400'
                    }`}>
                      {project.name}
                    </span>

                    {/* Expand chevron if there are slots to show */}
                    {canExpand && (
                      <div className="text-gray-500">
                        {isExpanded ? (
                          <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronRight className="w-3 h-3" />
                        )}
                      </div>
                    )}
                  </button>

                  {/* All Slots - show when expanded */}
                  {isExpanded && allSlots.length > 0 && (
                    <div className="ml-4 space-y-0.5 border-l border-gray-800 pl-2">
                      {allSlots.map((slot) => (
                        <div
                          key={slot.slotId}
                          className="flex items-center gap-2 px-2 py-1 text-xs"
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${getHealthColor(slot.health)}`} />
                          <span className={`font-mono text-[10px] ${
                            slot.health === 'healthy' ? 'text-green-400' :
                            slot.health === 'degraded' ? 'text-yellow-400' : 'text-red-400'
                          }`}>{slot.mainPort}</span>
                          <span className={`capitalize ${
                            slot.health === 'healthy' ? 'text-green-400' :
                            slot.health === 'degraded' ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            {slot.tradeline}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {projects.length === 0 && !loading && (
              <div className="px-4 py-6 text-center text-gray-500 text-sm">
                No status data available
              </div>
            )}

            {loading && (
              <div className="px-4 py-6 text-center text-gray-500 text-sm">
                Loading...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
