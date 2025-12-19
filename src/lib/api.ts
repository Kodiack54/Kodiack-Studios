/**
 * Patcher API Client - Multi-Service Architecture
 *
 * All dashboard interactions with servers go through their respective Patchers.
 * The dashboard NEVER does SSH directly - Patchers handle all remote operations.
 *
 * PATCHER SERVICES:
 * - 7101: NextBid Engine Patcher (Tradeline Servers Service Opps Finder)
 * - 7102: NextBid Portal Patcher (User Portals)
 * - 7103: NextBidder Patcher (Auction House Suppliers Opp Finder)
 * - 7104: Sources Patcher (New Sources Discovery Server)
 * - 7105: NextTech Patcher (Tech App/Operations/SOP tool)
 * - 7106: NextTask Patcher (MMO Style Task Generator)
 *
 * DASHBOARD SERVICES:
 * - 7500: Dashboard UI
 * - 7501: WebSocket (real-time updates)
 * - 7502: Monitoring Service
 * - 7503: Control Service
 * - 7510: Auth Service
 * - 7540: Help Desk Service
 */

// Patcher service URLs
const PATCHER_URLS = {
  engine: process.env.PATCHER_ENGINE_URL || 'http://134.199.209.140:7101',
  portals: process.env.PATCHER_PORTALS_URL || 'http://134.199.209.140:7102',
  nextbidder: process.env.PATCHER_NEXTBIDDER_URL || 'http://134.199.209.140:7103',
  sources: process.env.PATCHER_SOURCES_URL || 'http://134.199.209.140:7104',
  nexttech: process.env.PATCHER_NEXTTECH_URL || 'http://134.199.209.140:7105',
  nexttask: process.env.PATCHER_NEXTTASK_URL || 'http://134.199.209.140:7106',
} as const;

// Dashboard service URLs
const DASHBOARD_URLS = {
  websocket: process.env.WEBSOCKET_URL || 'ws://134.199.209.140:7501',
  monitoring: process.env.MONITORING_URL || 'http://134.199.209.140:7502',
  control: process.env.CONTROL_URL || 'http://134.199.209.140:7503',
  auth: process.env.AUTH_URL || 'http://134.199.209.140:7510',
  helpdesk: process.env.HELPDESK_URL || 'http://134.199.209.140:7540',
} as const;

export type PatcherService = keyof typeof PATCHER_URLS;
export type DashboardService = keyof typeof DASHBOARD_URLS;

export interface ApiResponse<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}

// ============================================================
// BASE API CALLS
// ============================================================

/**
 * Call any Patcher service API
 */
export async function callPatcher<T = unknown>(
  service: PatcherService,
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: unknown,
  token?: string
): Promise<T> {
  const baseUrl = PATCHER_URLS[service];
  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    config.body = JSON.stringify(data);
  }

  const response = await fetch(`${baseUrl}${endpoint}`, config);

  if (!response.ok) {
    throw new Error(`Patcher API error (${service}): ${response.statusText}`);
  }

  return response.json();
}

/**
 * Call Dashboard service API (monitoring, control, auth, helpdesk)
 */
export async function callDashboardService<T = unknown>(
  service: Exclude<DashboardService, 'websocket'>,
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: unknown,
  token?: string
): Promise<T> {
  const baseUrl = DASHBOARD_URLS[service];
  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    config.body = JSON.stringify(data);
  }

  const response = await fetch(`${baseUrl}${endpoint}`, config);

  if (!response.ok) {
    throw new Error(`Dashboard service error (${service}): ${response.statusText}`);
  }

  return response.json();
}

// ============================================================
// 7101 - NEXTBID ENGINE PATCHER (Tradeline Servers Service Opps Finder)
// ============================================================

export const enginePatcher = {
  // Server Control
  startTradeline: (tradeline: string) =>
    callPatcher('engine', `/server/start/${tradeline}`, 'POST'),
  stopTradeline: (tradeline: string) =>
    callPatcher('engine', `/server/stop/${tradeline}`, 'POST'),
  restartTradeline: (tradeline: string) =>
    callPatcher('engine', `/server/restart/${tradeline}`, 'POST'),
  launchAll: () =>
    callPatcher('engine', '/server/launch-all', 'POST'),
  stopAll: () =>
    callPatcher('engine', '/server/stop-all', 'POST'),
  restartAll: () =>
    callPatcher('engine', '/server/restart-all', 'POST'),

  // Status & Health
  getHealthAll: () =>
    callPatcher('engine', '/server/health-all'),
  getStatus: (tradeline: string) =>
    callPatcher('engine', `/server/status/${tradeline}`),
  getTradelines: () =>
    callPatcher('engine', '/tradelines'),
  getRegistryStats: () =>
    callPatcher('engine', '/registry/stats'),

  // Logs
  getLogs: (tradeline: string, lines = 100) =>
    callPatcher('engine', `/server/logs/${tradeline}?lines=${lines}`),

  // Config
  getConfig: (tradeline: string) =>
    callPatcher('engine', `/config/${tradeline}`),
  pushConfig: (tradeline: string, config: unknown) =>
    callPatcher('engine', `/config/${tradeline}`, 'POST', config),

  // Deployment
  deploy: (tradeline: string, options?: unknown) =>
    callPatcher('engine', `/patch/${tradeline}`, 'POST', options),
  deployAll: (options?: unknown) =>
    callPatcher('engine', '/patch/all', 'POST', options),
  getHistory: (limit = 20) =>
    callPatcher('engine', `/history?limit=${limit}`),

  // Dev Sync
  getDevStatus: () =>
    callPatcher('engine', '/dev/status'),
  devPull: () =>
    callPatcher('engine', '/dev/pull', 'POST'),
  devCompare: () =>
    callPatcher('engine', '/dev/compare', 'POST'),
  devPush: () =>
    callPatcher('engine', '/dev/push', 'POST'),
  devPushTradeline: (tradeline: string) =>
    callPatcher('engine', `/dev/push/${tradeline}`, 'POST'),
  devSyncDeploy: () =>
    callPatcher('engine', '/dev/sync-deploy', 'POST'),

  // Credentials
  getCredentialsSummary: () =>
    callPatcher('engine', '/credentials/summary'),
  getCredentials: (tradeline: string, raw = false) =>
    callPatcher('engine', `/credentials/${tradeline}${raw ? '?raw=true' : ''}`),
  updateCredentials: (tradeline: string, credentials: unknown) =>
    callPatcher('engine', `/credentials/${tradeline}`, 'PUT', credentials),

  // Tradeline Data
  getNAICSCodes: () =>
    callPatcher('engine', '/naics'),
  getPSCCodes: () =>
    callPatcher('engine', '/psc'),
  getUNSPSCCodes: () =>
    callPatcher('engine', '/unspsc'),
  getKeywords: () =>
    callPatcher('engine', '/keywords'),
  getApis: () =>
    callPatcher('engine', '/apis'),
};

// ============================================================
// 7102 - NEXTBID PORTAL PATCHER (User Portals)
// ============================================================

export const portalsPatcher = {
  // Portal Management
  getPortals: () =>
    callPatcher('portals', '/portals'),
  getPortal: (portalId: string) =>
    callPatcher('portals', `/portals/${portalId}`),
  createPortal: (data: unknown) =>
    callPatcher('portals', '/portals', 'POST', data),
  updatePortal: (portalId: string, data: unknown) =>
    callPatcher('portals', `/portals/${portalId}`, 'PUT', data),
  deletePortal: (portalId: string) =>
    callPatcher('portals', `/portals/${portalId}`, 'DELETE'),

  // Portal Config
  getConfig: (platform: string, portalId: string) =>
    callPatcher('portals', `/portals/${platform}/${portalId}`),
  getCategories: (platform: string, portalId: string, tradeline: string) =>
    callPatcher('portals', `/portals/${platform}/${portalId}/categories/${tradeline}`),
  updateCategories: (platform: string, portalId: string, tradeline: string, categories: unknown) =>
    callPatcher('portals', `/portals/${platform}/${portalId}/categories/${tradeline}`, 'PUT', categories),

  // Portal Health
  getHealth: () =>
    callPatcher('portals', '/health'),
  getPortalHealth: (portalId: string) =>
    callPatcher('portals', `/health/${portalId}`),

  // Deployment
  deploy: (portalId: string) =>
    callPatcher('portals', `/deploy/${portalId}`, 'POST'),
  deployAll: () =>
    callPatcher('portals', '/deploy/all', 'POST'),

  // Logs
  getLogs: (portalId: string, lines = 100) =>
    callPatcher('portals', `/logs/${portalId}?lines=${lines}`),
};

// ============================================================
// 7103 - NEXTBIDDER PATCHER (Auction House Suppliers Opp Finder)
// ============================================================

export const nextbidderPatcher = {
  // Server Control
  start: () =>
    callPatcher('nextbidder', '/server/start', 'POST'),
  stop: () =>
    callPatcher('nextbidder', '/server/stop', 'POST'),
  restart: () =>
    callPatcher('nextbidder', '/server/restart', 'POST'),

  // Health & Status
  getHealth: () =>
    callPatcher('nextbidder', '/health'),
  getStatus: () =>
    callPatcher('nextbidder', '/status'),

  // Auction Sources
  getSources: () =>
    callPatcher('nextbidder', '/sources'),
  getSource: (sourceId: string) =>
    callPatcher('nextbidder', `/sources/${sourceId}`),
  addSource: (data: unknown) =>
    callPatcher('nextbidder', '/sources', 'POST', data),
  updateSource: (sourceId: string, data: unknown) =>
    callPatcher('nextbidder', `/sources/${sourceId}`, 'PUT', data),
  deleteSource: (sourceId: string) =>
    callPatcher('nextbidder', `/sources/${sourceId}`, 'DELETE'),

  // Credentials
  getCredentials: () =>
    callPatcher('nextbidder', '/credentials'),
  updateCredentials: (data: unknown) =>
    callPatcher('nextbidder', '/credentials', 'PUT', data),

  // Discovery
  runDiscovery: () =>
    callPatcher('nextbidder', '/discovery/run', 'POST'),
  getDiscoveryStatus: () =>
    callPatcher('nextbidder', '/discovery/status'),

  // Config
  getConfig: () =>
    callPatcher('nextbidder', '/config'),
  updateConfig: (config: unknown) =>
    callPatcher('nextbidder', '/config', 'PUT', config),

  // Logs
  getLogs: (lines = 100) =>
    callPatcher('nextbidder', `/logs?lines=${lines}`),

  // Deployment
  deploy: (options?: unknown) =>
    callPatcher('nextbidder', '/deploy', 'POST', options),
};

// ============================================================
// 7104 - SOURCES PATCHER (New Sources Discovery Server)
// ============================================================

export const sourcesPatcher = {
  // Server Control
  start: () =>
    callPatcher('sources', '/server/start', 'POST'),
  stop: () =>
    callPatcher('sources', '/server/stop', 'POST'),
  restart: () =>
    callPatcher('sources', '/server/restart', 'POST'),

  // Health & Status
  getHealth: () =>
    callPatcher('sources', '/health'),
  getStatus: () =>
    callPatcher('sources', '/status'),

  // Source Discovery
  getSources: (type?: 'service' | 'suppliers') =>
    callPatcher('sources', type ? `/sources?type=${type}` : '/sources'),
  getSource: (sourceId: string) =>
    callPatcher('sources', `/sources/${sourceId}`),
  addSource: (data: unknown) =>
    callPatcher('sources', '/sources', 'POST', data),
  updateSource: (sourceId: string, data: unknown) =>
    callPatcher('sources', `/sources/${sourceId}`, 'PUT', data),
  deleteSource: (sourceId: string) =>
    callPatcher('sources', `/sources/${sourceId}`, 'DELETE'),
  verifySource: (sourceId: string) =>
    callPatcher('sources', `/sources/${sourceId}/verify`, 'POST'),

  // Discovery Queue
  getQueue: () =>
    callPatcher('sources', '/queue'),
  addToQueue: (url: string, type: 'service' | 'suppliers') =>
    callPatcher('sources', '/queue', 'POST', { url, type }),
  processQueue: () =>
    callPatcher('sources', '/queue/process', 'POST'),

  // Config
  getConfig: () =>
    callPatcher('sources', '/config'),
  updateConfig: (config: unknown) =>
    callPatcher('sources', '/config', 'PUT', config),

  // Logs
  getLogs: (lines = 100) =>
    callPatcher('sources', `/logs?lines=${lines}`),

  // Deployment
  deploy: (options?: unknown) =>
    callPatcher('sources', '/deploy', 'POST', options),
};

// ============================================================
// 7105 - NEXTTECH PATCHER (Tech App/Operations/SOP tool)
// ============================================================

export const nexttechPatcher = {
  // Server Control
  start: () =>
    callPatcher('nexttech', '/server/start', 'POST'),
  stop: () =>
    callPatcher('nexttech', '/server/stop', 'POST'),
  restart: () =>
    callPatcher('nexttech', '/server/restart', 'POST'),

  // Health & Status
  getHealth: () =>
    callPatcher('nexttech', '/health'),
  getStatus: () =>
    callPatcher('nexttech', '/status'),

  // SOPs (Standard Operating Procedures)
  getSops: () =>
    callPatcher('nexttech', '/sops'),
  getSop: (sopId: string) =>
    callPatcher('nexttech', `/sops/${sopId}`),
  createSop: (data: unknown) =>
    callPatcher('nexttech', '/sops', 'POST', data),
  updateSop: (sopId: string, data: unknown) =>
    callPatcher('nexttech', `/sops/${sopId}`, 'PUT', data),
  deleteSop: (sopId: string) =>
    callPatcher('nexttech', `/sops/${sopId}`, 'DELETE'),

  // Workflows
  getWorkflows: () =>
    callPatcher('nexttech', '/workflows'),
  getWorkflow: (workflowId: string) =>
    callPatcher('nexttech', `/workflows/${workflowId}`),
  createWorkflow: (data: unknown) =>
    callPatcher('nexttech', '/workflows', 'POST', data),
  updateWorkflow: (workflowId: string, data: unknown) =>
    callPatcher('nexttech', `/workflows/${workflowId}`, 'PUT', data),
  executeWorkflow: (workflowId: string, params?: unknown) =>
    callPatcher('nexttech', `/workflows/${workflowId}/execute`, 'POST', params),

  // Operations
  getOperations: () =>
    callPatcher('nexttech', '/operations'),
  getOperation: (opId: string) =>
    callPatcher('nexttech', `/operations/${opId}`),
  createOperation: (data: unknown) =>
    callPatcher('nexttech', '/operations', 'POST', data),

  // Config
  getConfig: () =>
    callPatcher('nexttech', '/config'),
  updateConfig: (config: unknown) =>
    callPatcher('nexttech', '/config', 'PUT', config),

  // Logs
  getLogs: (lines = 100) =>
    callPatcher('nexttech', `/logs?lines=${lines}`),

  // Deployment
  deploy: (options?: unknown) =>
    callPatcher('nexttech', '/deploy', 'POST', options),
};

// ============================================================
// 7106 - NEXTTASK PATCHER (MMO Style Never Ending Task Generator)
// ============================================================

export const nexttaskPatcher = {
  // Server Control
  start: () =>
    callPatcher('nexttask', '/server/start', 'POST'),
  stop: () =>
    callPatcher('nexttask', '/server/stop', 'POST'),
  restart: () =>
    callPatcher('nexttask', '/server/restart', 'POST'),

  // Health & Status
  getHealth: () =>
    callPatcher('nexttask', '/health'),
  getStatus: () =>
    callPatcher('nexttask', '/status'),

  // Task Management
  getTasks: (filters?: { status?: string; assignee?: string; priority?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.assignee) params.append('assignee', filters.assignee);
    if (filters?.priority) params.append('priority', filters.priority);
    const query = params.toString();
    return callPatcher('nexttask', `/tasks${query ? `?${query}` : ''}`);
  },
  getTask: (taskId: string) =>
    callPatcher('nexttask', `/tasks/${taskId}`),
  createTask: (data: unknown) =>
    callPatcher('nexttask', '/tasks', 'POST', data),
  updateTask: (taskId: string, data: unknown) =>
    callPatcher('nexttask', `/tasks/${taskId}`, 'PUT', data),
  deleteTask: (taskId: string) =>
    callPatcher('nexttask', `/tasks/${taskId}`, 'DELETE'),
  completeTask: (taskId: string, result?: unknown) =>
    callPatcher('nexttask', `/tasks/${taskId}/complete`, 'POST', result),

  // Task Generation
  generateTasks: (count = 1) =>
    callPatcher('nexttask', '/generate', 'POST', { count }),
  getGenerationQueue: () =>
    callPatcher('nexttask', '/generate/queue'),

  // Task Categories/Types
  getTaskTypes: () =>
    callPatcher('nexttask', '/types'),
  createTaskType: (data: unknown) =>
    callPatcher('nexttask', '/types', 'POST', data),
  updateTaskType: (typeId: string, data: unknown) =>
    callPatcher('nexttask', `/types/${typeId}`, 'PUT', data),

  // Rewards & Progression
  getRewards: () =>
    callPatcher('nexttask', '/rewards'),
  getUserProgress: (userId: string) =>
    callPatcher('nexttask', `/progress/${userId}`),
  getLeaderboard: () =>
    callPatcher('nexttask', '/leaderboard'),

  // Config
  getConfig: () =>
    callPatcher('nexttask', '/config'),
  updateConfig: (config: unknown) =>
    callPatcher('nexttask', '/config', 'PUT', config),

  // Logs
  getLogs: (lines = 100) =>
    callPatcher('nexttask', `/logs?lines=${lines}`),

  // Deployment
  deploy: (options?: unknown) =>
    callPatcher('nexttask', '/deploy', 'POST', options),
};

// ============================================================
// 7510 - AUTH SERVICE
// ============================================================

export const authService = {
  login: (email: string, password: string) =>
    callDashboardService('auth', '/auth/login', 'POST', { email, password }),
  logout: (token: string) =>
    callDashboardService('auth', '/auth/logout', 'POST', undefined, token),
  getMe: (token: string) =>
    callDashboardService('auth', '/auth/me', 'GET', undefined, token),
  checkPermission: (action: string, token: string) =>
    callDashboardService('auth', '/auth/check-permission', 'POST', { action }, token),
  changePassword: (oldPassword: string, newPassword: string, token: string) =>
    callDashboardService('auth', '/auth/change-password', 'POST', { oldPassword, newPassword }, token),
  getHealth: () =>
    callDashboardService('auth', '/health'),
};

// ============================================================
// 7540 - HELPDESK SERVICE
// ============================================================

export const helpdeskService = {
  // Tickets
  getTickets: (filters?: { status?: string; category?: string; assigned_to?: string }, token?: string) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.assigned_to) params.append('assigned_to', filters.assigned_to);
    const query = params.toString();
    return callDashboardService('helpdesk', `/helpdesk/tickets${query ? `?${query}` : ''}`, 'GET', undefined, token);
  },
  getTicket: (ticketId: string, token?: string) =>
    callDashboardService('helpdesk', `/helpdesk/tickets/${ticketId}`, 'GET', undefined, token),
  createTicket: (data: unknown) =>
    callDashboardService('helpdesk', '/helpdesk/tickets', 'POST', data),
  assignTicket: (ticketId: string, assignedTo: string, token?: string) =>
    callDashboardService('helpdesk', `/helpdesk/tickets/${ticketId}/assign`, 'POST', { assigned_to: assignedTo }, token),
  addMessage: (ticketId: string, message: unknown, token?: string) =>
    callDashboardService('helpdesk', `/helpdesk/tickets/${ticketId}/message`, 'POST', message, token),
  resolveTicket: (ticketId: string, resolvedBy: string, notes: string, token?: string) =>
    callDashboardService('helpdesk', `/helpdesk/tickets/${ticketId}/resolve`, 'POST', { resolved_by: resolvedBy, resolution_notes: notes }, token),
  getStats: (token?: string) =>
    callDashboardService('helpdesk', '/helpdesk/stats', 'GET', undefined, token),
  getHealth: () =>
    callDashboardService('helpdesk', '/health'),
};

// ============================================================
// 7502 - MONITORING SERVICE
// ============================================================

export const monitoringService = {
  // Overview
  getOverview: (token?: string) =>
    callDashboardService('monitoring', '/monitoring/overview', 'GET', undefined, token),

  // Alerts
  getAlerts: (filters?: { severity?: string; source?: string; status?: string }, token?: string) => {
    const params = new URLSearchParams();
    if (filters?.severity) params.append('severity', filters.severity);
    if (filters?.source) params.append('source', filters.source);
    if (filters?.status) params.append('status', filters.status);
    const query = params.toString();
    return callDashboardService('monitoring', `/monitoring/alerts${query ? `?${query}` : ''}`, 'GET', undefined, token);
  },
  acknowledgeAlert: (alertId: string, token?: string) =>
    callDashboardService('monitoring', `/monitoring/alerts/${alertId}/acknowledge`, 'POST', undefined, token),
  resolveAlert: (alertId: string, notes: string, token?: string) =>
    callDashboardService('monitoring', `/monitoring/alerts/${alertId}/resolve`, 'POST', { notes }, token),

  // Server Health
  getServerHealth: (token?: string) =>
    callDashboardService('monitoring', '/monitoring/servers', 'GET', undefined, token),
  getServerHealthById: (serverId: string, token?: string) =>
    callDashboardService('monitoring', `/monitoring/servers/${serverId}`, 'GET', undefined, token),

  // Credentials Health
  getCredentialHealth: (token?: string) =>
    callDashboardService('monitoring', '/monitoring/credentials', 'GET', undefined, token),

  // System Tickets
  getSystemTickets: (filters?: { priority?: string; status?: string; source?: string }, token?: string) => {
    const params = new URLSearchParams();
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.source) params.append('source', filters.source);
    const query = params.toString();
    return callDashboardService('monitoring', `/monitoring/tickets${query ? `?${query}` : ''}`, 'GET', undefined, token);
  },

  getHealth: () =>
    callDashboardService('monitoring', '/health'),
};

// ============================================================
// 7503 - CONTROL SERVICE
// ============================================================

export const controlService = {
  // SSH Operations (Engineers only)
  sshExecute: (serverId: string, command: string, token?: string) =>
    callDashboardService('control', '/control/ssh/execute', 'POST', { serverId, command }, token),
  sshGetHistory: (serverId?: string, token?: string) => {
    const query = serverId ? `?serverId=${serverId}` : '';
    return callDashboardService('control', `/control/ssh/history${query}`, 'GET', undefined, token);
  },

  // Deployment Operations
  deploy: (target: string, options?: Record<string, unknown>, token?: string) =>
    callDashboardService('control', '/control/deploy', 'POST', { target, ...options }, token),
  getDeployHistory: (limit = 20, token?: string) =>
    callDashboardService('control', `/control/deploy/history?limit=${limit}`, 'GET', undefined, token),
  rollback: (deployId: string, token?: string) =>
    callDashboardService('control', `/control/deploy/${deployId}/rollback`, 'POST', undefined, token),

  // Code Push
  codePush: (target: string, options?: Record<string, unknown>, token?: string) =>
    callDashboardService('control', '/control/code-push', 'POST', { target, ...options }, token),
  getCodePushHistory: (limit = 20, token?: string) =>
    callDashboardService('control', `/control/code-push/history?limit=${limit}`, 'GET', undefined, token),

  // Build Operations
  build: (target: string, options?: Record<string, unknown>, token?: string) =>
    callDashboardService('control', '/control/build', 'POST', { target, ...options }, token),
  getBuildHistory: (limit = 20, token?: string) =>
    callDashboardService('control', `/control/build/history?limit=${limit}`, 'GET', undefined, token),

  // Credential Management
  getCredentials: (type?: string, token?: string) => {
    const query = type ? `?type=${type}` : '';
    return callDashboardService('control', `/control/credentials${query}`, 'GET', undefined, token);
  },
  updateCredential: (credentialId: string, data: unknown, token?: string) =>
    callDashboardService('control', `/control/credentials/${credentialId}`, 'PUT', data, token),
  testCredential: (credentialId: string, token?: string) =>
    callDashboardService('control', `/control/credentials/${credentialId}/test`, 'POST', undefined, token),

  getHealth: () =>
    callDashboardService('control', '/health'),
};

// ============================================================
// COMBINED UTILITIES
// ============================================================

/**
 * Get health status from all patchers
 */
export async function getAllPatchersHealth() {
  const results = await Promise.allSettled([
    enginePatcher.getHealthAll(),
    portalsPatcher.getHealth(),
    nextbidderPatcher.getHealth(),
    sourcesPatcher.getHealth(),
    nexttechPatcher.getHealth(),
    nexttaskPatcher.getHealth(),
  ]);

  return {
    engine: results[0].status === 'fulfilled' ? results[0].value : { status: 'offline', error: (results[0] as PromiseRejectedResult).reason?.message },
    portals: results[1].status === 'fulfilled' ? results[1].value : { status: 'offline', error: (results[1] as PromiseRejectedResult).reason?.message },
    nextbidder: results[2].status === 'fulfilled' ? results[2].value : { status: 'offline', error: (results[2] as PromiseRejectedResult).reason?.message },
    sources: results[3].status === 'fulfilled' ? results[3].value : { status: 'offline', error: (results[3] as PromiseRejectedResult).reason?.message },
    nexttech: results[4].status === 'fulfilled' ? results[4].value : { status: 'offline', error: (results[4] as PromiseRejectedResult).reason?.message },
    nexttask: results[5].status === 'fulfilled' ? results[5].value : { status: 'offline', error: (results[5] as PromiseRejectedResult).reason?.message },
  };
}

/**
 * Get health status from all dashboard services
 */
export async function getAllDashboardServicesHealth() {
  const results = await Promise.allSettled([
    authService.getHealth(),
    helpdeskService.getHealth(),
    monitoringService.getHealth(),
    controlService.getHealth(),
  ]);

  return {
    auth: results[0].status === 'fulfilled' ? results[0].value : { status: 'offline', error: (results[0] as PromiseRejectedResult).reason?.message },
    helpdesk: results[1].status === 'fulfilled' ? results[1].value : { status: 'offline', error: (results[1] as PromiseRejectedResult).reason?.message },
    monitoring: results[2].status === 'fulfilled' ? results[2].value : { status: 'offline', error: (results[2] as PromiseRejectedResult).reason?.message },
    control: results[3].status === 'fulfilled' ? results[3].value : { status: 'offline', error: (results[3] as PromiseRejectedResult).reason?.message },
  };
}

// ============================================================
// LEGACY EXPORTS (for backward compatibility)
// ============================================================

// These map to the original single-patcher API
export const startTradeline = enginePatcher.startTradeline;
export const stopTradeline = enginePatcher.stopTradeline;
export const restartTradeline = enginePatcher.restartTradeline;
export const launchAllTradelines = enginePatcher.launchAll;
export const stopAllTradelines = enginePatcher.stopAll;
export const restartAllTradelines = enginePatcher.restartAll;
export const getHealthAll = enginePatcher.getHealthAll;
export const getTradelineStatus = enginePatcher.getStatus;
export const getTradelines = enginePatcher.getTradelines;
export const getRegistryStats = enginePatcher.getRegistryStats;
export const getTradelineLogs = enginePatcher.getLogs;
export const getTradelineConfig = enginePatcher.getConfig;
export const pushTradelineConfig = enginePatcher.pushConfig;
export const deployTradeline = enginePatcher.deploy;
export const deployAll = enginePatcher.deployAll;
export const getDeployHistory = enginePatcher.getHistory;
export const getDevStatus = enginePatcher.getDevStatus;
export const devPull = enginePatcher.devPull;
export const devCompare = enginePatcher.devCompare;
export const devPush = enginePatcher.devPush;
export const devPushTradeline = enginePatcher.devPushTradeline;
export const devSyncDeploy = enginePatcher.devSyncDeploy;
export const getCredentialsSummary = enginePatcher.getCredentialsSummary;
export const getTradelineCredentials = enginePatcher.getCredentials;
export const updateTradelineCredentials = enginePatcher.updateCredentials;
export const getPortals = portalsPatcher.getPortals;
export const getPortalConfig = portalsPatcher.getConfig;
export const getPortalCategories = portalsPatcher.getCategories;
