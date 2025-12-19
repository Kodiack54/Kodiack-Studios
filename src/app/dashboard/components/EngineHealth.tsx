'use client';

import { useEffect, useState } from 'react';
import { workerRoles } from '@/config/tradelines';

type HealthStatus = 'online' | 'offline' | 'degraded' | 'loading';

interface Slot {
  id: string;
  slotNumber: number;
  tradeline: string | null;
  tradelineName: string;
  mainPort: number;
}

interface ServiceHealth {
  id: string;
  slotId: string;
  slotNumber: number;
  tradeline: string | null;
  tradelineName: string;
  role: string;
  port: number;
  host: string;
  status: HealthStatus;
  responseTime?: number;
}

interface HealthResponse {
  total: number;
  online: number;
  offline: number;
  degraded: number;
  slots: Slot[];
  services: ServiceHealth[];
}

interface EngineHealthProps {
  userRole?: string; // superadmin, admin, dev, etc.
}

export default function EngineHealth({ userRole = 'dev' }: EngineHealthProps) {
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  const isSuperAdmin = userRole === 'superadmin';

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/engine/health');
      const data = await res.json();
      setHealthData(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch health:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    // Refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const statusColors: Record<HealthStatus, string> = {
    online: 'bg-green-500',
    offline: 'bg-red-500',
    degraded: 'bg-yellow-500',
    loading: 'bg-gray-500 animate-pulse',
  };

  const statusBgColors: Record<HealthStatus, string> = {
    online: 'bg-green-500/10 border-green-500/30',
    offline: 'bg-red-500/10 border-red-500/30',
    degraded: 'bg-yellow-500/10 border-yellow-500/30',
    loading: 'bg-gray-500/10 border-gray-500/30',
  };

  // Get health for a slot
  const getSlotHealth = (slotId: string) => {
    if (!healthData) return { main: 'loading' as HealthStatus, workers: {} as Record<string, HealthStatus> };

    const services = healthData.services.filter((s) => s.slotId === slotId);
    const main = services.find((s) => s.role === 'main');
    const workers: Record<string, HealthStatus> = {};

    for (const worker of workerRoles) {
      const w = services.find((s) => s.role === worker.role);
      workers[worker.role] = w?.status || 'loading';
    }

    return {
      main: main?.status || 'loading',
      workers,
    };
  };

  // Get overall slot status (worst of all services)
  const getSlotStatus = (slotId: string): HealthStatus => {
    const { main, workers } = getSlotHealth(slotId);
    const allStatuses = [main, ...Object.values(workers)];

    if (allStatuses.includes('offline')) return 'offline';
    if (allStatuses.includes('degraded')) return 'degraded';
    if (allStatuses.includes('loading')) return 'loading';
    return 'online';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Engine Slots</h3>
          <p className="text-xs text-gray-500">
            {healthData ? `${healthData.slots.length} slots × 5 services = ${healthData.total} total` : 'Loading...'}
            {lastUpdated && ` · Updated ${lastUpdated.toLocaleTimeString()}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <button
              onClick={() => setEditMode(!editMode)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                editMode
                  ? 'bg-yellow-500 text-black'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {editMode ? 'Exit Edit Mode' : 'Edit Slots'}
            </button>
          )}
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="px-3 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Edit Mode Warning */}
      {editMode && (
        <div className="bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 px-4 py-2 rounded-lg text-sm">
          <strong>Edit Mode:</strong> Click a slot to reassign its tradeline. Changes require server restart.
        </div>
      )}

      {/* Summary Stats */}
      {healthData && (
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-white">{healthData.total}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-400">{healthData.online}</div>
            <div className="text-xs text-gray-500">Online</div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-center">
            <div className={`text-2xl font-bold ${healthData.degraded > 0 ? 'text-yellow-400' : 'text-gray-400'}`}>
              {healthData.degraded}
            </div>
            <div className="text-xs text-gray-500">Degraded</div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-center">
            <div className={`text-2xl font-bold ${healthData.offline > 0 ? 'text-red-400' : 'text-gray-400'}`}>
              {healthData.offline}
            </div>
            <div className="text-xs text-gray-500">Offline</div>
          </div>
        </div>
      )}

      {/* Slot Grid */}
      {healthData && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
            {healthData.slots.map((slot) => {
              const status = getSlotStatus(slot.id);
              const health = getSlotHealth(slot.id);
              const isExpanded = expandedSlot === slot.id;
              const isUnassigned = !slot.tradeline;

              return (
                <div key={slot.id}>
                  <button
                    onClick={() => setExpandedSlot(isExpanded ? null : slot.id)}
                    className={`w-full p-2 rounded-lg border transition-all ${
                      isUnassigned
                        ? 'bg-gray-700/50 border-gray-600 border-dashed'
                        : statusBgColors[status]
                    } ${editMode ? 'ring-2 ring-yellow-500/50' : ''} hover:opacity-80`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">Slot {slot.slotNumber}</span>
                      <span className={`w-2 h-2 rounded-full ${isUnassigned ? 'bg-gray-500' : statusColors[status]}`} />
                    </div>
                    <div className={`text-xs font-medium truncate ${isUnassigned ? 'text-gray-500 italic' : 'text-white'}`}>
                      {slot.tradelineName}
                    </div>
                    <div className="text-xs text-gray-600 mb-1">:{slot.mainPort}</div>
                    {!isUnassigned && (
                      <div className="flex gap-1 items-center">
                        {/* Main dot with port */}
                        <div className="flex flex-col items-center" title={`Main :${slot.mainPort}`}>
                          <div className={`w-3 h-3 rounded-full ${statusColors[health.main]}`} />
                          <span className="text-[8px] text-gray-500">{slot.mainPort}</span>
                        </div>
                        {/* Worker dots with ports */}
                        {workerRoles.map((w) => (
                          <div key={w.role} className="flex flex-col items-center" title={`${w.name} :${slot.mainPort + w.offset}`}>
                            <div className={`w-3 h-3 rounded-full ${statusColors[health.workers[w.role] || 'loading']}`} />
                            <span className="text-[8px] text-gray-500">{slot.mainPort + w.offset}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-1 p-2 bg-gray-900 rounded-lg border border-gray-700 text-xs space-y-1">
                      {isUnassigned ? (
                        <div className="text-gray-500 text-center py-2">
                          {editMode ? 'Click to assign a tradeline' : 'No tradeline assigned'}
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Main</span>
                            <span className="flex items-center gap-1">
                              <span className={`w-2 h-2 rounded-full ${statusColors[health.main]}`} />
                              <span className="text-gray-500">:{slot.mainPort}</span>
                            </span>
                          </div>
                          {workerRoles.map((w) => (
                            <div key={w.role} className="flex items-center justify-between">
                              <span className="text-gray-400">{w.name}</span>
                              <span className="flex items-center gap-1">
                                <span className={`w-2 h-2 rounded-full ${statusColors[health.workers[w.role] || 'loading']}`} />
                                <span className="text-gray-500">:{slot.mainPort + w.offset}</span>
                              </span>
                            </div>
                          ))}
                        </>
                      )}
                      {editMode && isSuperAdmin && (
                        <button className="w-full mt-2 px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs hover:bg-yellow-500/30">
                          Change Assignment
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-gray-700">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <div className="w-2 h-2 rounded-full bg-green-500" /> Online
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <div className="w-2 h-2 rounded-full bg-yellow-500" /> Degraded
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <div className="w-2 h-2 rounded-full bg-red-500" /> Offline
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <div className="w-2 h-2 rounded-sm bg-gray-500 border border-dashed border-gray-400" /> Unassigned
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
