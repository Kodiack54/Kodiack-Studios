// Tradeline Configuration
// Engine Droplet: 64.23.151.201
// Tradelines are loaded from dev_tradelines table
// This file contains fallback defaults and type definitions

export const ENGINE_HOST = process.env.ENGINE_HOST || '64.23.151.201';

// Fallback tradelines - used if database is unavailable
// Actual tradelines are pulled from dev_tradelines table
export const defaultTradelines = [
  { id: 'security', name: 'Security', mainPort: 3002, host: '64.23.151.201' },
  { id: 'administrative', name: 'Administrative', mainPort: 3003, host: '64.23.151.201' },
  { id: 'facilities', name: 'Facilities', mainPort: 3004, host: '64.23.151.201' },
  { id: 'logistics', name: 'Logistics', mainPort: 3005, host: '64.23.151.201' },
  { id: 'electrical', name: 'Electrical', mainPort: 3006, host: '64.23.151.201' },
  { id: 'lowvoltage', name: 'Low Voltage', mainPort: 3007, host: '64.23.151.201' },
  { id: 'landscaping', name: 'Landscaping', mainPort: 3008, host: '64.23.151.201' },
  { id: 'hvac', name: 'HVAC', mainPort: 3009, host: '64.23.151.201' },
  { id: 'plumbing', name: 'Plumbing', mainPort: 3010, host: '64.23.151.201' },
  { id: 'janitorial', name: 'Janitorial', mainPort: 3011, host: '64.23.151.201' },
  { id: 'support', name: 'Support', mainPort: 3012, host: '64.23.151.201' },
  { id: 'waste', name: 'Waste', mainPort: 3013, host: '64.23.151.201' },
  { id: 'construction', name: 'Construction', mainPort: 3014, host: '64.23.151.201' },
  { id: 'roofing', name: 'Roofing', mainPort: 3015, host: '64.23.151.201' },
  { id: 'painting', name: 'Painting', mainPort: 3016, host: '64.23.151.201' },
  { id: 'flooring', name: 'Flooring', mainPort: 3017, host: '64.23.151.201' },
  { id: 'demolition', name: 'Demolition', mainPort: 3018, host: '64.23.151.201' },
  { id: 'environmental', name: 'Environmental', mainPort: 3019, host: '64.23.151.201' },
  { id: 'concrete', name: 'Concrete', mainPort: 3020, host: '64.23.151.201' },
  { id: 'fencing', name: 'Fencing', mainPort: 3021, host: '64.23.151.201' },
];

// For backwards compatibility
export const tradelines = defaultTradelines;

// Worker roles - each tradeline has 3 workers
export const workerRoles = [
  { offset: 100, role: 'sow', name: 'SOW', description: 'SOW processing' },
  { offset: 200, role: 'docs', name: 'Docs', description: 'Document processing' },
  { offset: 300, role: 'proposal', name: 'Proposal', description: 'AI proposal writer material' },
] as const;

export type TradelineId = typeof tradelines[number]['id'];
export type WorkerRole = typeof workerRoles[number]['role'];

// Helper to get all ports for a tradeline
export function getTradelinePorts(mainPort: number) {
  return {
    main: mainPort,
    fetch: mainPort + 100,
    parse: mainPort + 200,
    ai: mainPort + 300,
    store: mainPort + 400,
  };
}

// Get full service list (100 services)
export function getAllServices() {
  const services: Array<{
    id: string;
    tradeline: string;
    tradelineName: string;
    type: 'main' | 'worker';
    role: string;
    roleName: string;
    port: number;
  }> = [];

  for (const tl of tradelines) {
    // Main server
    services.push({
      id: `${tl.id}-main`,
      tradeline: tl.id,
      tradelineName: tl.name,
      type: 'main',
      role: 'main',
      roleName: 'Main',
      port: tl.mainPort,
    });

    // Workers
    for (const worker of workerRoles) {
      services.push({
        id: `${tl.id}-${worker.role}`,
        tradeline: tl.id,
        tradelineName: tl.name,
        type: 'worker',
        role: worker.role,
        roleName: worker.name,
        port: tl.mainPort + worker.offset,
      });
    }
  }

  return services;
}

// Patcher/Dashboard services (7000 range)
export const patcherServices = [
  { id: 'gateway', name: 'Gateway', port: 7000, description: 'JWT auth hub' },
  { id: 'patcher', name: 'Patcher', port: 7100, description: 'Deployment orchestrator' },
  { id: 'dashboard', name: 'Dashboard', port: 7500, description: 'Dev command center' },
] as const;

// Portal services (8000 range)
export const portalServices = [
  { id: 'nextbidder', name: 'NextBidder', port: 8001, description: 'Win SUPPLY contracts' },
  { id: 'nexttech', name: 'NextTech', port: 8002, description: 'Dispatch/Tech App/SOP' },
  { id: 'nextsource', name: 'NextSource', port: 8003, description: 'AI source learner' },
  { id: 'portal', name: 'Portal', port: 8004, description: 'User opportunity/proposal UI' },
] as const;

// Dev services (5000 range)
export const devServices = [
  { id: 'nextbid-live', name: 'NextBid Live', port: 5000, description: 'Test engine before prod' },
  { id: 'nextbid-dev', name: 'NextBid Dev', port: 5100, description: 'Engine development' },
  { id: 'nextbidder-live', name: 'NextBidder Live', port: 5001, description: 'Test before prod' },
  { id: 'nextbidder-dev', name: 'NextBidder Dev', port: 5101, description: 'Development' },
  { id: 'nexttech-live', name: 'NextTech Live', port: 5002, description: 'Test before prod' },
  { id: 'nexttech-dev', name: 'NextTech Dev', port: 5102, description: 'Development' },
  { id: 'source-live', name: 'Source Live', port: 5003, description: 'Test before prod' },
  { id: 'source-dev', name: 'Source Dev', port: 5103, description: '400+ sources dev' },
  { id: 'portal-live', name: 'Portal Live', port: 5004, description: 'Test before prod' },
  { id: 'portal-dev', name: 'Portal Dev', port: 5104, description: 'Portal development' },
] as const;
