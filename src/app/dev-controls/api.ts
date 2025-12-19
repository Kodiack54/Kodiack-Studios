// Dev Controls API - Connects to real Patcher services
// Port 7100: Deployment Orchestrator (routes to sub-patchers)
// Port 7101: Tradeline Patcher (engine-specific operations)

// Base URLs for patcher services
// In production, dashboard and patcher are on the same droplet (134.199.209.140)
// Dashboard calls patcher via localhost
const ORCHESTRATOR_URL = process.env.NEXT_PUBLIC_ORCHESTRATOR_URL || 'http://localhost:7100';
const TRADELINE_PATCHER_URL = process.env.NEXT_PUBLIC_TRADELINE_PATCHER_URL || 'http://localhost:7101';

// Generic API request helper
async function apiRequest<T>(baseUrl: string, endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${baseUrl}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || error.message || `API Error: ${res.status}`);
  }

  return res.json();
}

// ============================================
// 7100 - Deployment Orchestrator
// ============================================

export async function getOrchestratorHealth() {
  return apiRequest(ORCHESTRATOR_URL, '/health');
}

export async function getServices() {
  return apiRequest<{
    orchestrator: { status: string; port: number };
    services: Record<string, { url: string; status: string; details?: any; error?: string }>;
  }>(ORCHESTRATOR_URL, '/services');
}

export async function getDeployJobs(limit = 20) {
  return apiRequest<{
    count: number;
    total: number;
    jobs: Array<{
      id: string;
      type: string;
      target: string;
      status: string;
      createdAt: string;
      completedAt?: string;
      result?: any;
      error?: string;
    }>;
  }>(ORCHESTRATOR_URL, `/deploy/jobs?limit=${limit}`);
}

export async function getDeployStatus(jobId: string) {
  return apiRequest(ORCHESTRATOR_URL, `/deploy/status/${jobId}`);
}

export async function deployTradeline(name: string, branch = 'main') {
  return apiRequest(ORCHESTRATOR_URL, `/deploy/tradeline/${name}`, {
    method: 'POST',
    body: JSON.stringify({ branch }),
  });
}

export async function deployAllTradelines(branch = 'main') {
  return apiRequest(ORCHESTRATOR_URL, '/deploy/tradeline/all', {
    method: 'POST',
    body: JSON.stringify({ branch }),
  });
}

export async function deployPortal(branch = 'main') {
  return apiRequest(ORCHESTRATOR_URL, '/deploy/portal', {
    method: 'POST',
    body: JSON.stringify({ branch }),
  });
}

export async function deploySources(branch = 'main') {
  return apiRequest(ORCHESTRATOR_URL, '/deploy/sources', {
    method: 'POST',
    body: JSON.stringify({ branch }),
  });
}

// ============================================
// 7101 - Tradeline Patcher: Registry & Identity
// ============================================

export async function getTradelinePatcherHealth() {
  return apiRequest(TRADELINE_PATCHER_URL, '/health');
}

export async function getTradelines() {
  return apiRequest<Array<{
    name: string;
    displayName: string;
    naics: string[];
    keywords: string[];
  }>>(TRADELINE_PATCHER_URL, '/tradelines');
}

export async function getRegistryStats() {
  return apiRequest<{
    totalServers: number;
    droplets: number;
    tradelines: number;
  }>(TRADELINE_PATCHER_URL, '/registry/stats');
}

export async function getRegistryDroplets() {
  return apiRequest(TRADELINE_PATCHER_URL, '/registry/droplets');
}

export async function getDropletServers(ip: string) {
  return apiRequest(TRADELINE_PATCHER_URL, `/registry/droplet/${ip}`);
}

export async function getTradelineServers(tradeline: string) {
  return apiRequest(TRADELINE_PATCHER_URL, `/registry/tradeline/${tradeline}`);
}

// ============================================
// 7101 - Tradeline Patcher: Credentials
// ============================================

export async function getCredentialsSummary() {
  return apiRequest(TRADELINE_PATCHER_URL, '/credentials/summary');
}

export async function getCredentialsAlerts() {
  return apiRequest(TRADELINE_PATCHER_URL, '/credentials/alerts');
}

export async function getTradelineCredentials(tradeline: string) {
  return apiRequest(TRADELINE_PATCHER_URL, `/credentials/${tradeline}`);
}

export async function updateTradelineCredentials(tradeline: string, credentials: Record<string, any>) {
  return apiRequest(TRADELINE_PATCHER_URL, `/credentials/${tradeline}`, {
    method: 'PUT',
    body: JSON.stringify(credentials),
  });
}

export async function updateSourceLoginStatus(tradeline: string, source: string, status: string) {
  return apiRequest(TRADELINE_PATCHER_URL, `/credentials/${tradeline}/source/${source}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
}

export async function updateApiBalance(tradeline: string, api: string, balance: number) {
  return apiRequest(TRADELINE_PATCHER_URL, `/credentials/${tradeline}/api/${api}/balance`, {
    method: 'POST',
    body: JSON.stringify({ balance }),
  });
}

// ============================================
// 7101 - Tradeline Patcher: Configuration
// ============================================

export async function getTradelineConfig(tradeline: string) {
  return apiRequest(TRADELINE_PATCHER_URL, `/config/${tradeline}`);
}

export async function updateTradelineConfig(tradeline: string, config: Record<string, any>) {
  return apiRequest(TRADELINE_PATCHER_URL, `/config/${tradeline}`, {
    method: 'POST',
    body: JSON.stringify(config),
  });
}

// ============================================
// 7101 - Tradeline Patcher: Deploy & Status
// ============================================

export async function patchTradeline(tradeline: string, options?: { branch?: string }) {
  return apiRequest(TRADELINE_PATCHER_URL, `/patch/${tradeline}`, {
    method: 'POST',
    body: JSON.stringify(options || {}),
  });
}

export async function patchAllTradelines(options?: { branch?: string }) {
  return apiRequest(TRADELINE_PATCHER_URL, '/patch/all', {
    method: 'POST',
    body: JSON.stringify(options || {}),
  });
}

export async function getAllStatus() {
  return apiRequest(TRADELINE_PATCHER_URL, '/status');
}

export async function getTradelineStatus(tradeline: string) {
  return apiRequest(TRADELINE_PATCHER_URL, `/status/${tradeline}`);
}

export async function getDeployHistory() {
  return apiRequest(TRADELINE_PATCHER_URL, '/history');
}

// ============================================
// 7101 - Tradeline Patcher: Server Control (PM2)
// ============================================

export async function startTradeline(tradeline: string) {
  return apiRequest(TRADELINE_PATCHER_URL, `/server/start/${tradeline}`, {
    method: 'POST',
  });
}

export async function stopTradeline(tradeline: string) {
  return apiRequest(TRADELINE_PATCHER_URL, `/server/stop/${tradeline}`, {
    method: 'POST',
  });
}

export async function restartTradeline(tradeline: string) {
  return apiRequest(TRADELINE_PATCHER_URL, `/server/restart/${tradeline}`, {
    method: 'POST',
  });
}

export async function getTradelinePM2Status(tradeline: string) {
  return apiRequest(TRADELINE_PATCHER_URL, `/server/status/${tradeline}`);
}

export async function getTradelineLogs(tradeline: string) {
  return apiRequest(TRADELINE_PATCHER_URL, `/server/logs/${tradeline}`);
}

export async function launchAllTradelines() {
  return apiRequest(TRADELINE_PATCHER_URL, '/server/launch-all', {
    method: 'POST',
  });
}

export async function getHealthAll() {
  return apiRequest(TRADELINE_PATCHER_URL, '/server/health-all');
}

export async function stopAllTradelines() {
  return apiRequest(TRADELINE_PATCHER_URL, '/server/stop-all', {
    method: 'POST',
  });
}

export async function restartAllTradelines() {
  return apiRequest(TRADELINE_PATCHER_URL, '/server/restart-all', {
    method: 'POST',
  });
}

// ============================================
// 7101 - Tradeline Patcher: Dev Sync
// ============================================

export async function getDevStatus() {
  return apiRequest(TRADELINE_PATCHER_URL, '/dev/status');
}

export async function gitPullDev() {
  return apiRequest(TRADELINE_PATCHER_URL, '/dev/pull', {
    method: 'POST',
  });
}

export async function compareDevProd() {
  return apiRequest(TRADELINE_PATCHER_URL, '/dev/compare', {
    method: 'POST',
  });
}

export async function getDevDiff() {
  return apiRequest(TRADELINE_PATCHER_URL, '/dev/diff');
}

export async function pushDevToProd() {
  return apiRequest(TRADELINE_PATCHER_URL, '/dev/push', {
    method: 'POST',
  });
}

export async function pushDevToTradeline(tradeline: string) {
  return apiRequest(TRADELINE_PATCHER_URL, `/dev/push/${tradeline}`, {
    method: 'POST',
  });
}

export async function pushDevToAllTradelines() {
  return apiRequest(TRADELINE_PATCHER_URL, '/dev/push-all', {
    method: 'POST',
  });
}

export async function fullSyncDeploy() {
  return apiRequest(TRADELINE_PATCHER_URL, '/dev/sync-deploy', {
    method: 'POST',
  });
}

// ============================================
// Legacy functions for backwards compatibility
// (Mapped to new endpoints)
// ============================================

export async function getDeployments(params?: {
  project?: string;
  status?: string;
  limit?: number;
}) {
  // Maps to /deploy/jobs on orchestrator
  return getDeployJobs(params?.limit || 20);
}

export async function getDeployment(deploymentId: string) {
  return getDeployStatus(deploymentId);
}

export async function deploy(config: {
  project: string;
  environment: 'development' | 'staging' | 'production';
  branch?: string;
  commit?: string;
  notes?: string;
}) {
  // Route to appropriate patcher based on project
  if (config.project === 'tradelines' || config.project.startsWith('tradeline-')) {
    const tradeline = config.project.replace('tradeline-', '');
    return tradeline === 'all'
      ? deployAllTradelines(config.branch)
      : deployTradeline(tradeline, config.branch);
  }
  if (config.project === 'portal') {
    return deployPortal(config.branch);
  }
  if (config.project === 'sources') {
    return deploySources(config.branch);
  }
  throw new Error(`Unknown project: ${config.project}`);
}

export async function getServers() {
  return getHealthAll();
}

export async function getServerStatus(serverId: string) {
  return getTradelinePM2Status(serverId);
}

export async function restartServer(serverId: string) {
  return restartTradeline(serverId);
}

export async function stopServer(serverId: string) {
  return stopTradeline(serverId);
}

export async function startServer(serverId: string) {
  return startTradeline(serverId);
}

export async function getServerLogs(serverId: string, _params?: {
  lines?: number;
  since?: string;
}) {
  return getTradelineLogs(serverId);
}

// Git operations - mapped to dev sync
export async function getRepositories() {
  // Return mock data since Git is handled via dev-sync
  return {
    repositories: [
      { id: 'tradelines', name: 'NextBid Engine Patcher', branch: 'main' },
      { id: 'portal', name: 'NextBid Portal Patcher', branch: 'main' },
      { id: 'sources', name: 'Sources Patcher', branch: 'main' },
      { id: 'dashboard', name: 'NextBid Dashboard', branch: 'main' },
    ]
  };
}

export async function gitPull(_repoId: string, _branch?: string) {
  return gitPullDev();
}

export async function gitPush(_repoId: string, _branch?: string) {
  return pushDevToProd();
}

// ============================================
// Release Train - Slot Management
// ============================================

export async function getSlots() {
  return apiRequest<Array<{
    slotId: string;
    mainPort: number;
    workerPorts: { fetch: number; parse: number; ai: number; store: number };
    tradeline: string | null;
    isActive: boolean;
    status: 'online' | 'offline' | 'starting' | 'stopping' | 'errored';
    lastHealthCheck?: string;
  }>>(TRADELINE_PATCHER_URL, '/slots');
}

export async function getSlot(slotId: string) {
  return apiRequest(TRADELINE_PATCHER_URL, `/slots/${slotId}`);
}

export async function getActiveSlots() {
  return apiRequest(TRADELINE_PATCHER_URL, '/slots/filter/active');
}

export async function getAvailableSlots() {
  return apiRequest(TRADELINE_PATCHER_URL, '/slots/filter/available');
}

export async function activateSlot(slotId: string, tradeline: string) {
  return apiRequest(TRADELINE_PATCHER_URL, `/slots/${slotId}/activate`, {
    method: 'POST',
    body: JSON.stringify({ tradeline }),
  });
}

export async function deactivateSlot(slotId: string) {
  return apiRequest(TRADELINE_PATCHER_URL, `/slots/${slotId}/deactivate`, {
    method: 'POST',
  });
}

export async function getSlotHealth(slotId: string) {
  return apiRequest(TRADELINE_PATCHER_URL, `/slots/${slotId}/health`);
}

export async function refreshSlots() {
  return apiRequest(TRADELINE_PATCHER_URL, '/slots/refresh', {
    method: 'POST',
  });
}

// ============================================
// Release Train - Canary Deployment
// ============================================

export interface CanaryConfig {
  tradeline: string;
  targetSlots: string[];  // Slot IDs to deploy to
  branch?: string;
}

export async function deployCanary(config: CanaryConfig) {
  // Deploy to specific slots only (canary)
  const results = [];
  for (const slotId of config.targetSlots) {
    try {
      const result = await apiRequest(TRADELINE_PATCHER_URL, `/dev/push/${config.tradeline}`, {
        method: 'POST',
        body: JSON.stringify({ slotId, branch: config.branch }),
      });
      results.push({ slotId, success: true, result });
    } catch (error) {
      results.push({ slotId, success: false, error: (error as Error).message });
    }
  }
  return { results, successCount: results.filter(r => r.success).length };
}

export async function expandCanary(tradeline: string, additionalSlots: string[]) {
  // Expand canary to more slots
  return deployCanary({ tradeline, targetSlots: additionalSlots });
}

export async function completeCanary(tradeline: string) {
  // Deploy to all remaining slots
  return pushDevToAllTradelines();
}

// ============================================
// Release Train - Version Info
// ============================================

export interface VersionInfo {
  commit: string;
  branch: string;
  message: string;
  author: string;
  date: string;
}

export async function getDevVersionInfo(): Promise<{ dev: VersionInfo; prod: VersionInfo; ahead: number; behind: number }> {
  const status = await getDevStatus() as any;
  return {
    dev: {
      commit: status.devCommit || 'unknown',
      branch: status.devBranch || 'main',
      message: status.devMessage || '',
      author: status.devAuthor || '',
      date: status.devDate || '',
    },
    prod: {
      commit: status.prodCommit || 'unknown',
      branch: status.prodBranch || 'main',
      message: status.prodMessage || '',
      author: status.prodAuthor || '',
      date: status.prodDate || '',
    },
    ahead: status.ahead || 0,
    behind: status.behind || 0,
  };
}

export async function getChangelog(): Promise<{ commits: Array<{ hash: string; message: string; author: string; date: string }> }> {
  const diff = await getDevDiff() as any;
  return {
    commits: diff.commits || [],
  };
}

// ============================================
// Analytics - Supabase Queries
// ============================================

export interface EngineAnalyticsData {
  opportunities: {
    week: number;
    month: number;
    year: number;
    allTime: number;
  };
  documents: {
    week: number;
    month: number;
    year: number;
    allTime: number;
  };
  bySource: {
    week: Record<string, number>;
    month: Record<string, number>;
    year: Record<string, number>;
    allTime: Record<string, number>;
  };
  aiCosts: {
    week: number;
    month: number;
    year: number;
    allTime: number;
  };
  storage: {
    used: {
      bytes: number;
      formatted: string;
    };
    limit: {
      bytes: number;
      formatted: string;
    };
    percentage: number;
  };
  tradelines: Array<{
    name: string;
    table: string;
    documents: number;
    storage: string;
    storageBytes: number;
    opportunities: number;
    status: 'online' | 'offline';
  }>;
  tradelineCount: {
    active: number;
    total: number;
  };
  lastUpdated: string;
}

export async function getEngineAnalytics(): Promise<{ success: boolean; data?: EngineAnalyticsData; error?: string }> {
  try {
    const res = await fetch('/api/dev-controls/analytics/engine', {
      cache: 'no-store',
    });
    return res.json();
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// ============================================
// Dev Environment (7501) - Deployment
// ============================================

export async function getDevEnvironmentStatus() {
  try {
    const res = await fetch('/api/deploy/dev-environment', {
      cache: 'no-store',
    });
    return res.json();
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function deployDevEnvironment() {
  try {
    const res = await fetch('/api/deploy/dev-environment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deploy' }),
    });
    return res.json();
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function restartDevEnvironment() {
  try {
    const res = await fetch('/api/deploy/dev-environment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'restart' }),
    });
    return res.json();
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function getDevEnvironmentLogs() {
  try {
    const res = await fetch('/api/deploy/dev-environment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logs' }),
    });
    return res.json();
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
