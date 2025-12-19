/**
 * NextTech API - 7105 NextTech Patcher
 *
 * All API calls specific to tech app/operations/SOP tool.
 * Database tables: nexttech_*
 */

const PATCHER_URL = process.env.PATCHER_NEXTTECH_URL || 'http://134.199.209.140:7105';

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
    throw new Error(`NextTech API error: ${response.statusText}`);
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
// SOPs (Standard Operating Procedures)
// ============================================================

export const getSops = () => callApi('/sops');
export const getSop = (sopId: string) => callApi(`/sops/${sopId}`);
export const createSop = (data: unknown) => callApi('/sops', 'POST', data);
export const updateSop = (sopId: string, data: unknown) =>
  callApi(`/sops/${sopId}`, 'PUT', data);
export const deleteSop = (sopId: string) =>
  callApi(`/sops/${sopId}`, 'DELETE');

// ============================================================
// WORKFLOWS
// ============================================================

export const getWorkflows = () => callApi('/workflows');
export const getWorkflow = (workflowId: string) => callApi(`/workflows/${workflowId}`);
export const createWorkflow = (data: unknown) => callApi('/workflows', 'POST', data);
export const updateWorkflow = (workflowId: string, data: unknown) =>
  callApi(`/workflows/${workflowId}`, 'PUT', data);
export const executeWorkflow = (workflowId: string, params?: unknown) =>
  callApi(`/workflows/${workflowId}/execute`, 'POST', params);

// ============================================================
// OPERATIONS
// ============================================================

export const getOperations = () => callApi('/operations');
export const getOperation = (opId: string) => callApi(`/operations/${opId}`);
export const createOperation = (data: unknown) => callApi('/operations', 'POST', data);

// ============================================================
// CREDENTIALS
// ============================================================

export const getCredentials = () => callApi('/credentials');
export const updateCredentials = (data: unknown) =>
  callApi('/credentials', 'PUT', data);

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
