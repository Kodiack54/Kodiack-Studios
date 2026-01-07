/**
 * Studio Services Configuration
 * All services monitored by the Operations NOC
 */

export type ServiceType = 'pc_emitter' | 'hub' | 'ai' | 'ui' | 'gateway';
export type ServiceGroup = 'pipeline' | 'ai_team';
export type ServiceStatus = 'online' | 'degraded' | 'offline' | 'unknown';

export interface StudioService {
  id: string;
  label: string;
  type: ServiceType;
  group: ServiceGroup;
  port?: number;
  healthEndpoint?: string;
  pm2Name?: string;
  description: string;
}

export const STUDIO_SERVICES: StudioService[] = [
  // Pipeline Group - ordered for sidebar display
  { id: 'user-pc', label: 'Michael-PremTech', type: 'pc_emitter', group: 'pipeline', description: 'Dump Emitter' },
  { id: 'terminal-5400', label: 'Terminal 5400', type: 'pc_emitter', group: 'pipeline', port: 5400, pm2Name: 'terminal-server-5400', description: 'Dump Emitter' },
  { id: 'dashboard-5500', label: 'Dashboard 5500', type: 'ui', group: 'pipeline', port: 5500, pm2Name: 'kodiack-dashboard-5500', description: 'UI Context (flips + heartbeat)' },
  { id: 'gateway-7000', label: 'Auth Gateway 7000', type: 'gateway', group: 'pipeline', port: 7000, healthEndpoint: '/health', pm2Name: 'dev-auth-7000', description: 'Auth Gateway' },
  { id: 'router-9500', label: 'Ingest Router 9500', type: 'hub', group: 'pipeline', port: 9500, healthEndpoint: '/health', pm2Name: 'transcripts-9500', description: 'Ingest Hub' },

  // AI Team Group - ordered 01-08 (chad, jen, susan, clair, mike, tiffany, ryan, jason)
  { id: 'chad-5401', label: 'Chad', type: 'ai', group: 'ai_team', port: 5401, healthEndpoint: '/health', pm2Name: 'chad-5401', description: 'Context Resolver' },
  { id: 'jen-5402', label: 'Jen', type: 'ai', group: 'ai_team', port: 5402, healthEndpoint: '/health', pm2Name: 'ai-jen-5402', description: 'Structure' },
  { id: 'susan-5403', label: 'Susan', type: 'ai', group: 'ai_team', port: 5403, healthEndpoint: '/health', pm2Name: 'susan-5403', description: 'Worklogs' },
  { id: 'clair-5404', label: 'Clair', type: 'ai', group: 'ai_team', port: 5404, pm2Name: 'clair-5404', description: 'Knowledge' },
  { id: 'mike-5405', label: 'Mike', type: 'ai', group: 'ai_team', port: 5405, pm2Name: 'mike-5405', description: 'QA Tester' },
  { id: 'tiffany-5406', label: 'Tiffany', type: 'ai', group: 'ai_team', port: 5406, pm2Name: 'tiffany-5406', description: 'QA Tester' },
  { id: 'ryan-5407', label: 'Ryan', type: 'ai', group: 'ai_team', port: 5407, healthEndpoint: '/health', pm2Name: 'ryan-5407', description: 'Roadmap' },
  { id: 'jason-5408', label: 'Jason', type: 'ai', group: 'ai_team', port: 5408, pm2Name: 'ai-jason-5408', description: 'Bugs/Todos' },
];

// Get all services sorted by port (user-pc first, then by port number)
export const getAllServicesSorted = () => {
  return [...STUDIO_SERVICES].sort((a, b) => {
    // user-pc (no port) comes first
    if (!a.port && !b.port) return 0;
    if (!a.port) return -1;
    if (!b.port) return 1;
    return a.port - b.port;
  });
};

// Helper functions
export const getPipelineServices = () => STUDIO_SERVICES.filter(s => s.group === 'pipeline');
export const getAITeamServices = () => STUDIO_SERVICES.filter(s => s.group === 'ai_team');
export const getServiceById = (id: string) => STUDIO_SERVICES.find(s => s.id === id);

// Status color mapping
export const STATUS_COLORS: Record<ServiceStatus, string> = {
  online: '#22c55e',    // green-500
  degraded: '#eab308',  // yellow-500
  offline: '#ef4444',   // red-500
  unknown: '#6b7280',   // gray-500
};
