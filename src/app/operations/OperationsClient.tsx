'use client';

import { useState, useEffect, useContext } from 'react';
import { PageTitleContext, PageActionsContext } from '@/app/layout';
import { STUDIO_SERVICES, StudioService, getPipelineServices, getAITeamServices } from './config';
import { ServiceHealth, HealthResponse, PipelineStats, StatsResponse } from './lib/types';
import ServiceCard from './components/ServiceCard';
import ServiceDetailPanel from './components/ServiceDetailPanel';
import StudioStatsPanel from './components/StudioStatsPanel';
import StudioLiveFeed from './components/StudioLiveFeed';
import DropletStatusPanel from './components/DropletStatusPanel';

export default function OperationsClient() {
  const [services] = useState<StudioService[]>(STUDIO_SERVICES);
  const [healthData, setHealthData] = useState<Record<string, ServiceHealth>>({});
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<StudioService | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // View toggle: 'studio' or 'ai_team'
  const [activeView, setActiveView] = useState<'studio' | 'ai_team'>('studio');
  
  // Show droplet panel instead of service detail
  const [showDropletPanel, setShowDropletPanel] = useState(true);

  const setPageTitle = useContext(PageTitleContext);
  const setPageActions = useContext(PageActionsContext);

  // Handle service selection - hide droplet panel when selecting a service
  const handleServiceClick = (service: StudioService) => {
    setSelectedService(service);
    setShowDropletPanel(false);
  };

  // Handle droplet button click
  const handleDropletClick = () => {
    setShowDropletPanel(true);
    setSelectedService(null);
  };

  // Set page title and actions (including view toggle buttons)
  useEffect(() => {
    setPageTitle({
      title: 'Operations',
      description: 'Studio Services NOC - Pipeline & AI Team Monitoring',
    });
    
    // Add STUDIO / AI TEAM / DROPLET toggle buttons to the page actions (blue header bar)
    // Positioned far right with ml-auto, thin black border for visibility
    setPageActions(
      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={() => setActiveView('studio')}
          className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all border border-black ${
            activeView === 'studio'
              ? 'bg-blue-500 text-white'
              : 'bg-blue-600/50 text-blue-100 hover:bg-blue-600/70'
          }`}
        >
          STUDIO
        </button>
        <button
          onClick={() => setActiveView('ai_team')}
          className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all border border-black ${
            activeView === 'ai_team'
              ? 'bg-blue-500 text-white'
              : 'bg-blue-600/50 text-blue-100 hover:bg-blue-600/70'
          }`}
        >
          AI TEAM
        </button>
        <button
          onClick={handleDropletClick}
          className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all border border-black ${
            showDropletPanel
              ? 'bg-blue-500 text-white'
              : 'bg-blue-600/50 text-blue-100 hover:bg-blue-600/70'
          }`}
        >
          DROPLET
        </button>
      </div>
    );
    
    return () => setPageActions(null);
  }, [setPageTitle, setPageActions, activeView, showDropletPanel]);

  // Fetch health data
  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/operations/health');
      const data: HealthResponse = await res.json();
      if (data.success) {
        const healthMap: Record<string, ServiceHealth> = {};
        data.services.forEach(s => {
          healthMap[s.id] = s;
        });
        setHealthData(healthMap);
        setError(null);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch pipeline stats
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/operations/stats');
      const data: StatsResponse = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (e) {
      console.error('Failed to fetch stats:', e);
    } finally {
      setStatsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchHealth();
    fetchStats();
  }, []);

  // Auto-refresh health every 10 seconds
  useEffect(() => {
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  // Auto-refresh stats every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Handle service selection from live feed
  const handleServiceSelect = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (service) {
      setSelectedService(service);
      setShowDropletPanel(false);
    }
  };

  // Get services based on active view, sorted by port
  const getDisplayServices = () => {
    const list = activeView === 'studio' ? getPipelineServices() : getAITeamServices();
    return [...list].sort((a, b) => {
      if (!a.port && !b.port) return 0;
      if (!a.port) return -1;
      if (!b.port) return 1;
      return a.port - b.port;
    });
  };

  const displayServices = getDisplayServices();

  // Count health statuses for displayed services
  const countByStatus = (serviceList: StudioService[], status: string) => {
    return serviceList.filter(s => (healthData[s.id]?.status || 'unknown') === status).length;
  };

  return (
    <div className="h-full flex flex-col -mt-4 overflow-hidden">
      {/* Error Alert */}
      {error && (
        <div className="flex-shrink-0 bg-red-500/15 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mx-4 mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Top Row: Service List (3/4) + Detail Panel (1/4) */}
      <div className="flex-shrink-0 flex gap-4 mx-4">
        {/* Service List - 3/4 width */}
        <div className="w-3/4 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden h-[320px] flex flex-col">
          {/* Header */}
          <div className="flex-shrink-0 bg-black/30 px-4 py-2 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase text-gray-500 font-medium tracking-wide">
                {activeView === 'studio' ? 'STUDIO SERVICES' : 'AI TEAM'} ({displayServices.length})
              </h3>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  {countByStatus(displayServices, 'online')} Online
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  {countByStatus(displayServices, 'degraded')} Degraded
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  {countByStatus(displayServices, 'offline')} Offline
                </span>
              </div>
            </div>
          </div>

          {/* Service list */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-700/50">
            {displayServices.map(service => (
              <ServiceCard
                key={service.id}
                service={service}
                health={healthData[service.id]}
                isSelected={selectedService?.id === service.id}
                onClick={() => handleServiceClick(service)}
              />
            ))}
          </div>
        </div>

        {/* Detail Panel - 1/4 width */}
        <div className="w-1/4 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden h-[320px]">
          {showDropletPanel ? (
            <DropletStatusPanel />
          ) : selectedService ? (
            <ServiceDetailPanel
              service={selectedService}
              health={healthData[selectedService.id]}
              onRefresh={fetchHealth}
            />
          ) : (
            <DropletStatusPanel />
          )}
        </div>
      </div>

      {/* Bottom Row: Stats Panel + Live Feed */}
      <div className="flex-1 min-h-0 mt-4 mx-4 flex gap-4 overflow-hidden">
        {/* Left: Stats Panel */}
        <div className="w-80 flex-shrink-0">
          <StudioStatsPanel stats={stats} loading={statsLoading} />
        </div>

        {/* Right: Live Feed */}
        <div className="flex-1">
          <StudioLiveFeed
            selectedServiceId={selectedService?.id}
            onServiceSelect={handleServiceSelect}
          />
        </div>
      </div>
    </div>
  );
}
