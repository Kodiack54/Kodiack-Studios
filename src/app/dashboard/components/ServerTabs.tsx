'use client';

import { useState } from 'react';
import TradelineCard from './TradelineCard';

interface Tradeline {
  name: string;
  displayName: string;
  ports?: {
    main: number;
    worker1: number;
    worker2: number;
    worker3: number;
    worker4: number;
  };
}

interface DevServer {
  name: string;
  type: string;
  port: number;
  host: string;
  description: string;
  live: boolean;
}

interface ServerTabsProps {
  tradelines: Tradeline[];
  healthAll: any;
  devServers: DevServer[];
  portalServers: DevServer[];
}

export default function ServerTabs({ tradelines, healthAll, devServers, portalServers }: ServerTabsProps) {
  const [activeTab, setActiveTab] = useState('tradelines');

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-0 border-b-2 border-gray-700 mb-6">
        <Tab
          active={activeTab === 'tradelines'}
          onClick={() => setActiveTab('tradelines')}
          count={tradelines.length}
        >
          NextBid Tradeline Servers
        </Tab>
        <Tab
          active={activeTab === 'dev'}
          onClick={() => setActiveTab('dev')}
          count={devServers.length}
        >
          NextBid Development Servers
        </Tab>
        <Tab
          active={activeTab === 'portals'}
          onClick={() => setActiveTab('portals')}
          count={portalServers.length}
        >
          NextBid Portal Servers
        </Tab>
      </div>

      {/* Tab Content */}
      {activeTab === 'tradelines' && (
        <TradelinesTab tradelines={tradelines} healthAll={healthAll} />
      )}
      {activeTab === 'dev' && (
        <DevServersTab servers={devServers} />
      )}
      {activeTab === 'portals' && (
        <PortalServersTab servers={portalServers} />
      )}
    </div>
  );
}

function Tab({
  active,
  onClick,
  count,
  children
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-8 py-3 text-sm font-semibold border-b-2 -mb-0.5 transition-colors flex items-center gap-2 ${
        active
          ? 'text-blue-400 border-blue-400'
          : 'text-gray-400 border-transparent hover:text-white'
      }`}
    >
      {children}
      <span className={`text-xs px-2 py-0.5 rounded-full ${
        active ? 'bg-blue-500 text-white' : 'bg-blue-500/20 text-blue-400'
      }`}>
        {count}
      </span>
    </button>
  );
}

function TradelinesTab({ tradelines, healthAll }: { tradelines: Tradeline[]; healthAll: any }) {
  const handleAction = async (action: string, tradeline?: string) => {
    const endpoint = tradeline
      ? `/api/server/${action}/${tradeline}`
      : `/api/server/${action}`;

    try {
      const res = await fetch(endpoint, { method: 'POST' });
      const result = await res.json();
      alert(result.success ? 'Action successful!' : `Error: ${result.error}`);
      if (result.success) {
        setTimeout(() => window.location.reload(), 2000);
      }
    } catch (e) {
      alert('Error: ' + (e as Error).message);
    }
  };

  return (
    <div>
      {/* Quick Actions */}
      <div className="flex gap-3 mb-5">
        <button
          onClick={() => handleAction('launch-all')}
          className="px-4 py-2 bg-green-500/15 text-green-400 border border-green-500/30 rounded-lg text-xs font-semibold uppercase hover:bg-green-500 hover:text-white transition-colors"
        >
          Launch All
        </button>
        <button
          onClick={() => handleAction('restart-all')}
          className="px-4 py-2 bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 rounded-lg text-xs font-semibold uppercase hover:bg-yellow-500 hover:text-white transition-colors"
        >
          Restart All
        </button>
        <button
          onClick={() => handleAction('stop-all')}
          className="px-4 py-2 bg-red-500/15 text-red-400 border border-red-500/30 rounded-lg text-xs font-semibold uppercase hover:bg-red-500 hover:text-white transition-colors"
        >
          Stop All
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-4 gap-4">
        {tradelines.map((t) => {
          const status = healthAll.tradelines?.[t.name] || {};
          return (
            <TradelineCard
              key={t.name}
              tradeline={t}
              status={status}
              onAction={handleAction}
            />
          );
        })}
      </div>
    </div>
  );
}

function DevServersTab({ servers }: { servers: DevServer[] }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {servers.map((s) => (
        <ServerCard key={s.name} server={s} category="dev" />
      ))}
    </div>
  );
}

function PortalServersTab({ servers }: { servers: DevServer[] }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {servers.map((s) => (
        <ServerCard key={s.name} server={s} category="portal" />
      ))}
    </div>
  );
}

function ServerCard({ server, category }: { server: DevServer; category: string }) {
  const borderColor = category === 'dev' ? 'border-l-yellow-500' : 'border-l-purple-500';

  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-xl p-5 border-l-4 ${borderColor} ${!server.live && 'opacity-50'}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="font-semibold text-white">{server.name}</div>
          <div className="text-xs text-gray-500 uppercase">{server.type}</div>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded ${
          server.live
            ? 'bg-green-500/20 text-green-400'
            : 'bg-gray-700 text-gray-400'
        }`}>
          {server.live ? 'ONLINE' : 'PENDING'}
        </span>
      </div>

      <div className="flex gap-3 mb-3 text-xs">
        <div>
          <span className="text-gray-500">Port:</span>
          <span className="ml-1 font-mono bg-black/30 px-1.5 py-0.5 rounded text-white">{server.port}</span>
        </div>
        <div>
          <span className="text-gray-500">Host:</span>
          <span className="ml-1 font-mono bg-black/30 px-1.5 py-0.5 rounded text-white">{server.host}</span>
        </div>
      </div>

      <p className="text-xs text-gray-400 mb-4">{server.description}</p>

      <div className="flex gap-2">
        <a
          href={`http://localhost:${server.port}/`}
          target="_blank"
          rel="noopener noreferrer"
          className={`px-3 py-1.5 text-xs font-semibold rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors ${!server.live && 'pointer-events-none opacity-50'}`}
        >
          Local
        </a>
        <a
          href={`http://${server.host}:${server.port}/`}
          target="_blank"
          rel="noopener noreferrer"
          className={`px-3 py-1.5 text-xs font-semibold rounded bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white transition-colors ${!server.live && 'pointer-events-none opacity-50'}`}
        >
          Online
        </a>
      </div>
    </div>
  );
}
