'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Activity, Cpu, Server, Bot } from 'lucide-react';
import { StudioService, getPipelineServices, getAITeamServices, STATUS_COLORS } from '../config';
import { ServiceHealth } from '../lib/types';

interface OperationsStatusIndicatorProps {
  onSelectService: (service: StudioService) => void;
  selectedServiceId?: string;
}

export default function OperationsStatusIndicator({
  onSelectService,
  selectedServiceId,
}: OperationsStatusIndicatorProps) {
  const [healthData, setHealthData] = useState<Record<string, ServiceHealth>>({});
  const [expandPipeline, setExpandPipeline] = useState(true);
  const [expandAITeam, setExpandAITeam] = useState(true);
  const [loading, setLoading] = useState(true);

  const pipelineServices = getPipelineServices();
  const aiTeamServices = getAITeamServices();

  // Fetch health data
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await fetch('/api/operations/health');
        const data = await res.json();
        if (data.success) {
          const healthMap: Record<string, ServiceHealth> = {};
          data.services.forEach((s: ServiceHealth) => {
            healthMap[s.id] = s;
          });
          setHealthData(healthMap);
        }
      } catch (e) {
        console.error('Failed to fetch health:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  // Count statuses for a group
  const getGroupStatus = (services: StudioService[]) => {
    let online = 0, degraded = 0, offline = 0;
    services.forEach(s => {
      const status = healthData[s.id]?.status || 'unknown';
      if (status === 'online') online++;
      else if (status === 'degraded') degraded++;
      else offline++;
    });
    return { online, degraded, offline };
  };

  const pipelineStatus = getGroupStatus(pipelineServices);
  const aiTeamStatus = getGroupStatus(aiTeamServices);

  // Get status color
  const getStatusColor = (status: string) => {
    return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.unknown;
  };

  // Get group overall color
  const getGroupColor = (status: { online: number; degraded: number; offline: number }) => {
    if (status.offline > 0) return STATUS_COLORS.offline;
    if (status.degraded > 0) return STATUS_COLORS.degraded;
    return STATUS_COLORS.online;
  };

  const renderServiceItem = (service: StudioService) => {
    const health = healthData[service.id];
    const status = health?.status || 'unknown';
    const isSelected = selectedServiceId === service.id;

    return (
      <button
        key={service.id}
        onClick={() => onSelectService(service)}
        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all ${
          isSelected
            ? 'bg-blue-500/20 border border-blue-500/50'
            : 'hover:bg-gray-800'
        }`}
      >
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: getStatusColor(status) }}
        />
        <span className={`flex-1 text-left truncate ${isSelected ? 'text-white' : 'text-gray-400'}`}>
          {service.label}
        </span>
        {service.port && (
          <span className="text-gray-600 text-[10px]">:{service.port}</span>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-2">
      {/* Pipeline Dropdown */}
      <div className="bg-gray-800/50 rounded-lg overflow-hidden">
        <button
          onClick={() => setExpandPipeline(!expandPipeline)}
          className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-white">Pipeline</span>
            <span className="text-xs text-gray-500">({pipelineServices.length})</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Status dots */}
            <div className="flex items-center gap-1">
              {pipelineStatus.online > 0 && (
                <div className="flex items-center gap-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-[10px] text-green-500">{pipelineStatus.online}</span>
                </div>
              )}
              {pipelineStatus.degraded > 0 && (
                <div className="flex items-center gap-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                  <span className="text-[10px] text-yellow-500">{pipelineStatus.degraded}</span>
                </div>
              )}
              {pipelineStatus.offline > 0 && (
                <div className="flex items-center gap-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <span className="text-[10px] text-red-500">{pipelineStatus.offline}</span>
                </div>
              )}
            </div>
            {expandPipeline ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
          </div>
        </button>

        {expandPipeline && (
          <div className="px-2 pb-2 space-y-0.5">
            {pipelineServices.map(renderServiceItem)}
          </div>
        )}
      </div>

      {/* AI Team Dropdown */}
      <div className="bg-gray-800/50 rounded-lg overflow-hidden">
        <button
          onClick={() => setExpandAITeam(!expandAITeam)}
          className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-white">AI Team</span>
            <span className="text-xs text-gray-500">({aiTeamServices.length})</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Status dots */}
            <div className="flex items-center gap-1">
              {aiTeamStatus.online > 0 && (
                <div className="flex items-center gap-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-[10px] text-green-500">{aiTeamStatus.online}</span>
                </div>
              )}
              {aiTeamStatus.degraded > 0 && (
                <div className="flex items-center gap-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                  <span className="text-[10px] text-yellow-500">{aiTeamStatus.degraded}</span>
                </div>
              )}
              {aiTeamStatus.offline > 0 && (
                <div className="flex items-center gap-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <span className="text-[10px] text-red-500">{aiTeamStatus.offline}</span>
                </div>
              )}
            </div>
            {expandAITeam ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
          </div>
        </button>

        {expandAITeam && (
          <div className="px-2 pb-2 space-y-0.5">
            {aiTeamServices.map(renderServiceItem)}
          </div>
        )}
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="text-center text-xs text-gray-500 py-2">
          Loading health data...
        </div>
      )}
    </div>
  );
}
