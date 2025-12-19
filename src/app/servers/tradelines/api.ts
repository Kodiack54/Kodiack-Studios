/**
 * Tradelines API - 7101 Engine Patcher
 *
 * All API calls specific to tradeline servers.
 * Database tables: security_, lowvoltage_, landscaping_, etc. (per tradeline)
 */

const PATCHER_URL = process.env.PATCHER_ENGINE_URL || 'http://134.199.209.140:7101';

async function callApi<T = unknown>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: unknown
): Promise<T> {
  const config: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    config.body = JSON.stringify(data);
  }

  const response = await fetch(`${PATCHER_URL}${endpoint}`, config);

  if (!response.ok) {
    throw new Error(`Tradelines API error: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================
// SERVER CONTROL
// ============================================================

export const startTradeline = (tradeline: string) =>
  callApi(`/server/start/${tradeline}`, 'POST');

export const stopTradeline = (tradeline: string) =>
  callApi(`/server/stop/${tradeline}`, 'POST');

export const restartTradeline = (tradeline: string) =>
  callApi(`/server/restart/${tradeline}`, 'POST');

export const launchAll = () =>
  callApi('/server/launch-all', 'POST');

export const stopAll = () =>
  callApi('/server/stop-all', 'POST');

export const restartAll = () =>
  callApi('/server/restart-all', 'POST');

// ============================================================
// STATUS & HEALTH
// ============================================================

export const getHealthAll = () =>
  callApi('/server/health-all');

export const getStatus = (tradeline: string) =>
  callApi(`/server/status/${tradeline}`);

export const getTradelines = () =>
  callApi('/tradelines');

export const getRegistryStats = () =>
  callApi('/registry/stats');

// ============================================================
// LOGS
// ============================================================

export const getLogs = (tradeline: string, lines = 100) =>
  callApi(`/server/logs/${tradeline}?lines=${lines}`);

// ============================================================
// CONFIG
// ============================================================

export const getConfig = (tradeline: string) =>
  callApi(`/config/${tradeline}`);

export const pushConfig = (tradeline: string, config: unknown) =>
  callApi(`/config/${tradeline}`, 'POST', config);

// ============================================================
// DEPLOYMENT
// ============================================================

export const deploy = (tradeline: string, options?: unknown) =>
  callApi(`/patch/${tradeline}`, 'POST', options);

export const deployAll = (options?: unknown) =>
  callApi('/patch/all', 'POST', options);

export const getHistory = (limit = 20) =>
  callApi(`/history?limit=${limit}`);

// ============================================================
// DEV SYNC
// ============================================================

export const getDevStatus = () =>
  callApi('/dev/status');

export const devPull = () =>
  callApi('/dev/pull', 'POST');

export const devCompare = () =>
  callApi('/dev/compare', 'POST');

export const devPush = () =>
  callApi('/dev/push', 'POST');

export const devPushTradeline = (tradeline: string) =>
  callApi(`/dev/push/${tradeline}`, 'POST');

export const devSyncDeploy = () =>
  callApi('/dev/sync-deploy', 'POST');

// ============================================================
// CREDENTIALS
// ============================================================

export const getCredentialsSummary = () =>
  callApi('/credentials/summary');

export const getCredentials = (tradeline: string, raw = false) =>
  callApi(`/credentials/${tradeline}${raw ? '?raw=true' : ''}`);

export const updateCredentials = (tradeline: string, credentials: unknown) =>
  callApi(`/credentials/${tradeline}`, 'PUT', credentials);

// ============================================================
// TRADELINE DATA
// ============================================================

export const getNAICSCodes = () =>
  callApi('/naics');

export const getPSCCodes = () =>
  callApi('/psc');

export const getUNSPSCCodes = () =>
  callApi('/unspsc');

export const getKeywords = () =>
  callApi('/keywords');

export const getApis = () =>
  callApi('/apis');

// ============================================================
// ANALYTICS (Supabase via Dashboard API)
// ============================================================

export async function getEngineAnalytics() {
  const res = await fetch('/api/dev-controls/analytics/engine', {
    cache: 'no-store',
  });
  return res.json();
}
