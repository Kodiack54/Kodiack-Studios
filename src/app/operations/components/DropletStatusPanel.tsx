'use client';

import { useState, useEffect } from 'react';

interface DropletStatus {
  name: string;
  ip: string;
  cpu: number;
  memory: number;
  disk: number;
  uptime: string;
  servicesOnline: number;
  servicesDegraded: number;
  servicesOffline: number;
}

export default function DropletStatusPanel() {
  const [status, setStatus] = useState<DropletStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/operations/droplet-status');
        const data = await res.json();
        if (data.success) {
          setStatus(data.status);
        }
      } catch (e) {
        console.error('Failed to fetch droplet status:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="bg-black/30 px-4 py-3 border-b border-gray-700">
          <h3 className="text-sm font-semibold text-white">Studio Droplet</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
          Loading...
        </div>
      </div>
    );
  }

  // Fallback data if API not ready
  const displayStatus = status || {
    name: 'Studio-Dev',
    ip: '161.35.229.220',
    cpu: 0,
    memory: 0,
    disk: 0,
    uptime: '—',
    servicesOnline: 0,
    servicesDegraded: 0,
    servicesOffline: 0,
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-black/30 px-4 py-3 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-white">{displayStatus.name}</h3>
        <p className="text-xs text-gray-500 font-mono">{displayStatus.ip}</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Resource Usage */}
        <div className="space-y-3">
          {/* CPU */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400">CPU</span>
              <span className="text-gray-300">{displayStatus.cpu.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-gray-700 rounded overflow-hidden">
              <div
                className={`h-full transition-all ${
                  displayStatus.cpu > 80 ? 'bg-red-500' : displayStatus.cpu > 50 ? 'bg-yellow-500' : 'bg-cyan-500'
                }`}
                style={{ width: `${Math.min(displayStatus.cpu, 100)}%` }}
              />
            </div>
          </div>

          {/* Memory */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400">Memory</span>
              <span className="text-gray-300">{displayStatus.memory.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-gray-700 rounded overflow-hidden">
              <div
                className={`h-full transition-all ${
                  displayStatus.memory > 80 ? 'bg-red-500' : displayStatus.memory > 50 ? 'bg-yellow-500' : 'bg-cyan-500'
                }`}
                style={{ width: `${Math.min(displayStatus.memory, 100)}%` }}
              />
            </div>
          </div>

          {/* Disk */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400">Disk</span>
              <span className="text-gray-300">{displayStatus.disk.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-gray-700 rounded overflow-hidden">
              <div
                className={`h-full transition-all ${
                  displayStatus.disk > 80 ? 'bg-red-500' : displayStatus.disk > 50 ? 'bg-yellow-500' : 'bg-cyan-500'
                }`}
                style={{ width: `${Math.min(displayStatus.disk, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-700" />

        {/* Uptime */}
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Uptime</span>
          <span className="text-white font-mono">{displayStatus.uptime}</span>
        </div>

        {/* Service Summary */}
        <div className="bg-gray-900/50 rounded-lg p-3 space-y-2">
          <div className="text-xs text-gray-500 uppercase font-medium">Services</div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs text-gray-300">Online</span>
            </div>
            <span className="text-sm font-semibold text-green-400">{displayStatus.servicesOnline}</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <span className="text-xs text-gray-300">Degraded</span>
            </div>
            <span className="text-sm font-semibold text-yellow-400">{displayStatus.servicesDegraded}</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-xs text-gray-300">Offline</span>
            </div>
            <span className="text-sm font-semibold text-red-400">{displayStatus.servicesOffline}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
