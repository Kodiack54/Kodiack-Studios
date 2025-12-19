/**
 * NextTask API - 7106 NextTask Patcher
 *
 * All API calls specific to MMO style never-ending task generator.
 * Database tables: nexttask_*
 */

const PATCHER_URL = process.env.PATCHER_NEXTTASK_URL || 'http://134.199.209.140:7106';

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
    throw new Error(`NextTask API error: ${response.statusText}`);
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
// TASK MANAGEMENT
// ============================================================

export const getTasks = (filters?: { status?: string; assignee?: string; priority?: string }) => {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.assignee) params.append('assignee', filters.assignee);
  if (filters?.priority) params.append('priority', filters.priority);
  const query = params.toString();
  return callApi(`/tasks${query ? `?${query}` : ''}`);
};
export const getTask = (taskId: string) => callApi(`/tasks/${taskId}`);
export const createTask = (data: unknown) => callApi('/tasks', 'POST', data);
export const updateTask = (taskId: string, data: unknown) =>
  callApi(`/tasks/${taskId}`, 'PUT', data);
export const deleteTask = (taskId: string) =>
  callApi(`/tasks/${taskId}`, 'DELETE');
export const completeTask = (taskId: string, result?: unknown) =>
  callApi(`/tasks/${taskId}/complete`, 'POST', result);

// ============================================================
// TASK GENERATION
// ============================================================

export const generateTasks = (count = 1) =>
  callApi('/generate', 'POST', { count });
export const getGenerationQueue = () =>
  callApi('/generate/queue');

// ============================================================
// TASK TYPES
// ============================================================

export const getTaskTypes = () => callApi('/types');
export const createTaskType = (data: unknown) => callApi('/types', 'POST', data);
export const updateTaskType = (typeId: string, data: unknown) =>
  callApi(`/types/${typeId}`, 'PUT', data);

// ============================================================
// REWARDS & PROGRESSION
// ============================================================

export const getRewards = () => callApi('/rewards');
export const getUserProgress = (userId: string) => callApi(`/progress/${userId}`);
export const getLeaderboard = () => callApi('/leaderboard');

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
