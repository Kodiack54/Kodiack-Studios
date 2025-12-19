/**
 * NextBidder API - 7103 NextBidder Patcher
 *
 * All API calls specific to auction house suppliers opportunity finder.
 * Database tables: nextbidder_*
 */

const PATCHER_URL = process.env.PATCHER_NEXTBIDDER_URL || 'http://134.199.209.140:7103';

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
    throw new Error(`NextBidder API error: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================
// SERVER CONTROL
// ============================================================

export const start = () => callApi('/server/start', 'POST');
export const stop = () => callApi('/server/stop', 'POST');
export const restart = () => callApi('/server/restart', 'POST');

// ============================================================
// HEALTH & STATUS
// ============================================================

export const getHealth = () => callApi('/health');
export const getStatus = () => callApi('/status');

// ============================================================
// AUCTION SOURCES
// ============================================================

export const getSources = () => callApi('/sources');
export const getSource = (sourceId: string) => callApi(`/sources/${sourceId}`);
export const addSource = (data: unknown) => callApi('/sources', 'POST', data);
export const updateSource = (sourceId: string, data: unknown) =>
  callApi(`/sources/${sourceId}`, 'PUT', data);
export const deleteSource = (sourceId: string) =>
  callApi(`/sources/${sourceId}`, 'DELETE');

// ============================================================
// CREDENTIALS
// ============================================================

export const getCredentials = () => callApi('/credentials');
export const updateCredentials = (data: unknown) =>
  callApi('/credentials', 'PUT', data);

// ============================================================
// DISCOVERY
// ============================================================

export const runDiscovery = () => callApi('/discovery/run', 'POST');
export const getDiscoveryStatus = () => callApi('/discovery/status');

// ============================================================
// CONFIG
// ============================================================

export const getConfig = () => callApi('/config');
export const updateConfig = (config: unknown) => callApi('/config', 'PUT', config);

// ============================================================
// LOGS
// ============================================================

export const getLogs = (lines = 100) => callApi(`/logs?lines=${lines}`);

// ============================================================
// DEPLOYMENT
// ============================================================

export const deploy = (options?: unknown) => callApi('/deploy', 'POST', options);
