'use client';

import { useState, useEffect, useContext } from 'react';
import { PageTitleContext, PageActionsContext } from '@/app/layout';
import { STUDIO_SERVICES, StudioService, getAllServicesSorted } from './config';
import { ServiceHealth, HealthResponse, PipelineStats, StatsResponse } from './lib/types';
import ServiceCard from './components/ServiceCard';
import ServiceDetailPanel from './components/ServiceDetailPanel';
import StudioStatsPanel from './components/StudioStatsPanel';
import StudioLiveFeed from './components/StudioLiveFeed';

export default function OperationsClient() {
  // NOTE: No auto-flip - Operations is for viewing, doesn't dictate context
  // User's current project/mode context is preserved while viewing ops

  const [services] = useState<StudioService[]>(STUDIO_SERVICES);
  const [healthData, setHealthData] = useState<Record<string, ServiceHealth>>({});
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<StudioService | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setPageTitle = useContext(PageTitleContext);
  const setPageActions = useContext(PageActionsContext);

  // Set page title
  useEffect(() => {
    setPageTitle({
      title: 'Operations',
      description: 'Studio Services NOC - Pipeline & AI Team Monitoring',
    });
    setPageActions(null);
    return () => setPageActions(null);
  }, [setPageTitle, setPageActions]);

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
    if (service) setSelectedService(service);
  };

  // Get all services sorted by port (user-pc first, then by port number)
  const sortedServices = getAllServicesSorted();

  // Count health statuses
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
        {/* Service List - 3/4 width - Single sorted list */}
        <div className="w-3/4 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden h-[320px] flex flex-col">
          {/* Header */}
          <div className="flex-shrink-0 bg-black/30 px-4 py-2 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase text-gray-500 font-medium tracking-wide">
                Studio Services ({sortedServices.length})
              </h3>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  {countByStatus(sortedServices, 'online')} Online
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  {countByStatus(sortedServices, 'degraded')} Degraded
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  {countByStatus(sortedServices, 'offline')} Offline
                </span>
              </div>
            </div>
          </div>

          {/* Single sorted list by port */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-700/50">
            {sortedServices.map(service => (
              <ServiceCard
                key={service.id}
                service={service}
                health={healthData[service.id]}
                isSelected={selectedService?.id === service.id}
                onClick={() => setSelectedService(service)}
              />
            ))}
          </div>
        </div>

        {/* Detail Panel - 1/4 width */}
        <div className="w-1/4 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden h-[320px]">
          {selectedService ? (
            <ServiceDetailPanel
              service={selectedService}
              health={healthData[selectedService.id]}
              onRefresh={fetchHealth}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm p-4">
              Select a service
            </div>
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
