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
  repoSlug?: string;  // Maps to git registry repo_slug
  description: string;
}

export const STUDIO_SERVICES: StudioService[] = [
  // Pipeline Group - ordered for sidebar display
  { id: 'user-pc', label: 'External Claude', type: 'pc_emitter', group: 'pipeline', description: 'PC heartbeat + transcript dumps' },
  { id: 'terminal-5400', label: 'Terminal Server', type: 'pc_emitter', group: 'pipeline', port: 5400, pm2Name: 'terminal-server-5400', repoSlug: 'terminal-server-5400', description: 'Server terminal + heartbeat' },
  { id: 'dashboard-5500', label: 'Dashboard', type: 'ui', group: 'pipeline', port: 5500, pm2Name: 'kodiack-dashboard-5500', repoSlug: 'kodiack-dashboard-5500', description: 'Context flips + heartbeat' },
  { id: 'gateway-7000', label: 'Auth Gateway', type: 'gateway', group: 'pipeline', port: 7000, healthEndpoint: '/health', pm2Name: 'dev-auth-7000', repoSlug: 'dev-auth-7000', description: 'Login + token auth' },
  { id: 'router-9500', label: 'Ingest Router', type: 'hub', group: 'pipeline', port: 9500, healthEndpoint: '/health', pm2Name: 'transcripts-9500', repoSlug: 'transcripts-9500', description: 'Transcript ingest hub' },
  { id: 'canonizer-9400', label: 'Canonizer', type: 'hub', group: 'pipeline', port: 9400, healthEndpoint: '/health', pm2Name: 'ops-9400-canonizer', repoSlug: 'ops-9400-canonizer', description: 'Conflict resolution + drift orchestrator' },

  // AI Team Group - repoSlug uses instance names (ai-chad-5401, etc.)
  { id: 'chad-5401', label: 'Chad', type: 'ai', group: 'ai_team', port: 5401, healthEndpoint: '/health', pm2Name: 'chad-5401', repoSlug: 'ai-chad-5401', description: 'Context resolver + session packer' },
  { id: 'jen-5402', label: 'Jen', type: 'ai', group: 'ai_team', port: 5402, healthEndpoint: '/health', pm2Name: 'ai-jen-5402', repoSlug: 'ai-jen-5402', description: 'Structure extractor' },
  { id: 'susan-5403', label: 'Susan', type: 'ai', group: 'ai_team', port: 5403, healthEndpoint: '/health', pm2Name: 'susan-5403', repoSlug: 'ai-susan-5403', description: 'Worklogs + memory' },
  { id: 'clair-5404', label: 'Clair', type: 'ai', group: 'ai_team', port: 5404, pm2Name: 'clair-5404', repoSlug: 'ai-clair-5404', description: 'Knowledge extractor' },
  { id: 'mike-5405', label: 'Mike', type: 'ai', group: 'ai_team', port: 5405, pm2Name: 'mike-5405', repoSlug: 'ai-mike-5405', description: 'QA tester' },
  { id: 'tiffany-5406', label: 'Tiffany', type: 'ai', group: 'ai_team', port: 5406, pm2Name: 'tiffany-5406', repoSlug: 'ai-tiffany-5406', description: 'QA tester' },
  { id: 'ryan-5407', label: 'Ryan', type: 'ai', group: 'ai_team', port: 5407, healthEndpoint: '/health', pm2Name: 'ryan-5407', repoSlug: 'ai-ryan-5407', description: 'Roadmap manager' },
  { id: 'jason-5408', label: 'Jason', type: 'ai', group: 'ai_team', port: 5408, pm2Name: 'ai-jason-5408', repoSlug: 'ai-jason-5408', description: 'Bug + todo extractor' },
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
