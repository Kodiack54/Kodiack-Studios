'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

// Server status types
export type ServerHealth = 'healthy' | 'degraded' | 'critical' | 'offline' | 'unknown';

export interface WorkerStatus {
  port: number;
  name: string; // 'Engine', 'Discovery', 'Scope of Work', 'Full Report', 'Proposal'
  status: 'online' | 'offline' | 'error';
  lastPing?: string;
  errorCount?: number;
}

export interface SlotStatus {
  slotId: string;
  tradeline: string;
  mainPort: number;
  workers: WorkerStatus[];
  health: ServerHealth;
  cpu?: number;
  memory?: number;
  requestsPerMin?: number;
  errorsToday?: number;
}

export interface ProjectStatus {
  id: string;
  name: string;
  patcherPort: number;
  prodPort: string;
  slots?: SlotStatus[]; // For Engine with 20 slots
  health: ServerHealth;
  totalSlots?: number;
  healthySlots?: number;
  degradedSlots?: number;
  offlineSlots?: number;
}

// Mock data - will be replaced with real API calls
const MOCK_PROJECTS: ProjectStatus[] = [
  {
    id: 'tradelines',
    name: 'NextBid Engine',
    patcherPort: 7101,
    prodPort: '31001-31020',
    health: 'degraded',
    totalSlots: 20,
    healthySlots: 18,
    degradedSlots: 2,
    offlineSlots: 0,
    slots: [
      { slotId: '01', tradeline: 'security', mainPort: 31001, health: 'healthy', workers: [], cpu: 45, memory: 62, requestsPerMin: 120 },
      { slotId: '02', tradeline: 'administrative', mainPort: 31002, health: 'healthy', workers: [], cpu: 38, memory: 55 },
      { slotId: '03', tradeline: 'facilities', mainPort: 31003, health: 'degraded', workers: [], cpu: 78, memory: 85 },
      { slotId: '04', tradeline: 'logistics', mainPort: 31004, health: 'healthy', workers: [] },
      { slotId: '05', tradeline: 'electrical', mainPort: 31005, health: 'healthy', workers: [] },
      { slotId: '06', tradeline: 'lowvoltage', mainPort: 31006, health: 'healthy', workers: [] },
      { slotId: '07', tradeline: 'landscaping', mainPort: 31007, health: 'healthy', workers: [] },
      { slotId: '08', tradeline: 'hvac', mainPort: 31008, health: 'degraded', workers: [] },
      { slotId: '09', tradeline: 'plumbing', mainPort: 31009, health: 'healthy', workers: [] },
      { slotId: '10', tradeline: 'janitorial', mainPort: 31010, health: 'healthy', workers: [] },
      { slotId: '11', tradeline: 'support', mainPort: 31011, health: 'healthy', workers: [] },
      { slotId: '12', tradeline: 'waste', mainPort: 31012, health: 'healthy', workers: [] },
      { slotId: '13', tradeline: 'construction', mainPort: 31013, health: 'healthy', workers: [] },
      { slotId: '14', tradeline: 'roofing', mainPort: 31014, health: 'healthy', workers: [] },
      { slotId: '15', tradeline: 'painting', mainPort: 31015, health: 'healthy', workers: [] },
      { slotId: '16', tradeline: 'flooring', mainPort: 31016, health: 'healthy', workers: [] },
      { slotId: '17', tradeline: 'demolition', mainPort: 31017, health: 'healthy', workers: [] },
      { slotId: '18', tradeline: 'environmental', mainPort: 31018, health: 'healthy', workers: [] },
      { slotId: '19', tradeline: 'concrete', mainPort: 31019, health: 'healthy', workers: [] },
      { slotId: '20', tradeline: 'fencing', mainPort: 31020, health: 'healthy', workers: [] },
    ],
  },
  {
    id: 'sources',
    name: 'NextSource',
    patcherPort: 7102,
    prodPort: '8002',
    health: 'healthy',
  },
  {
    id: 'nextbidder',
    name: 'NextBidder',
    patcherPort: 7103,
    prodPort: '8003',
    health: 'healthy',
  },
  {
    id: 'portals',
    name: 'NextBid Portal',
    patcherPort: 7104,
    prodPort: '8004',
    health: 'healthy',
  },
  {
    id: 'nexttech',
    name: 'NextTech',
    patcherPort: 7105,
    prodPort: '8005',
    health: 'healthy',
  },
  {
    id: 'nexttask',
    name: 'NextTask',
    patcherPort: 7106,
    prodPort: '8006',
    health: 'critical',
  },
];

interface ServerStatusIndicatorProps {
  onSelectProject?: (project: ProjectStatus) => void;
  onSelectSlot?: (project: ProjectStatus, slot: SlotStatus) => void;
  selectedProjectId?: string;
  selectedSlotId?: string;
}

export default function ServerStatusIndicator({
  onSelectProject,
  onSelectSlot,
  selectedProjectId,
  selectedSlotId,
}: ServerStatusIndicatorProps) {
  const [projects, setProjects] = useState<ProjectStatus[]>(MOCK_PROJECTS);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  // Fetch real data from API
  // Poll faster (every 3s) when a slot is selected, otherwise every 30s
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch('/api/servers/health');
        if (response.ok) {
          const data = await response.json();
          if (data.projects) {
            setProjects(data.projects);
          }
        }
      } catch (error) {
        console.error('Failed to fetch server health:', error);
      }
    };

    fetchHealth();
    const pollInterval = selectedSlotId ? 3000 : 30000; // Fast poll when slot selected
    const interval = setInterval(fetchHealth, pollInterval);
    return () => clearInterval(interval);
  }, [selectedSlotId]);

  const getHealthColor = (health: ServerHealth) => {
    switch (health) {
      case 'healthy': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-600';
    }
  };

  // Check if project has expandable slots
  const hasExpandableSlots = (project: ProjectStatus) => {
    return project.slots && project.slots.length > 0;
  };

  const handleProjectClick = (project: ProjectStatus) => {
    // If project has slots, only toggle expand (don't open detail panel)
    if (hasExpandableSlots(project)) {
      setExpandedProject(expandedProject === project.id ? null : project.id);
    } else {
      // Only open detail panel for projects without slots (simple projects)
      onSelectProject?.(project);
    }
  };

  const handleSlotClick = (project: ProjectStatus, slot: SlotStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectSlot?.(project, slot);
  };

  // Get all slots sorted by slotId
  const getAllSlots = (project: ProjectStatus) => {
    if (!project.slots) return [];
    return [...project.slots].sort((a, b) => a.slotId.localeCompare(b.slotId));
  };

  return (
    <div className="space-y-0.5">
      {/* Compact Project List - just dot + name */}
      {projects.map((project) => {
        const allSlots = getAllSlots(project);
        const canExpand = allSlots.length > 0;
        const isExpanded = expandedProject === project.id;

        return (
          <div key={project.id}>
            <button
              onClick={() => handleProjectClick(project)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-all ${
                selectedProjectId === project.id
                  ? 'bg-cyan-500/15'
                  : 'hover:bg-gray-800/30'
              }`}
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
              <div className="ml-4 mt-0.5 space-y-0.5 border-l border-gray-800 pl-2">
                {allSlots.map((slot) => (
                  <button
                    key={slot.slotId}
                    onClick={(e) => handleSlotClick(project, slot, e)}
                    className={`w-full flex items-center gap-2 px-2 py-1 rounded text-xs transition-all ${
                      selectedSlotId === slot.slotId
                        ? 'bg-cyan-500/20'
                        : 'hover:bg-gray-800/30'
                    }`}
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
                    <span className="flex-1" />
                    {selectedSlotId === slot.slotId && (
                      <span className="text-cyan-400 text-xs">&gt;</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Export individual status dot component for use elsewhere
export function StatusDot({ health, size = 'sm', pulse = false }: { health: ServerHealth; size?: 'sm' | 'md' | 'lg'; pulse?: boolean }) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  };

  const getColor = (health: ServerHealth) => {
    switch (health) {
      case 'healthy': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-600';
    }
  };

  return (
    <span className={`inline-block rounded-full ${sizeClasses[size]} ${getColor(health)} ${
      pulse || health === 'critical' ? 'animate-pulse' : ''
    }`} />
  );
}
