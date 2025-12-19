/**
 * Portals API - 7102 Portal Patcher
 *
 * All API calls specific to user portals.
 * Database tables: nextbid_portals, nextbid_portal_*, company_*, user_*
 */

const PATCHER_URL = process.env.PATCHER_PORTALS_URL || 'http://134.199.209.140:7102';

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
    throw new Error(`Portals API error: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================
// PORTAL MANAGEMENT
// ============================================================

export const getPortals = () =>
  callApi('/portals');

export const getPortal = (portalId: string) =>
  callApi(`/portals/${portalId}`);

export const createPortal = (data: unknown) =>
  callApi('/portals', 'POST', data);

export const updatePortal = (portalId: string, data: unknown) =>
  callApi(`/portals/${portalId}`, 'PUT', data);

export const deletePortal = (portalId: string) =>
  callApi(`/portals/${portalId}`, 'DELETE');

// ============================================================
// PORTAL CONFIG
// ============================================================

export const getConfig = (platform: string, portalId: string) =>
  callApi(`/portals/${platform}/${portalId}`);

export const getCategories = (platform: string, portalId: string, tradeline: string) =>
  callApi(`/portals/${platform}/${portalId}/categories/${tradeline}`);

export const updateCategories = (
  platform: string,
  portalId: string,
  tradeline: string,
  categories: unknown
) =>
  callApi(`/portals/${platform}/${portalId}/categories/${tradeline}`, 'PUT', categories);

// ============================================================
// PORTAL HEALTH
// ============================================================

export const getHealth = () =>
  callApi('/health');

export const getPortalHealth = (portalId: string) =>
  callApi(`/health/${portalId}`);

// ============================================================
// DEPLOYMENT
// ============================================================

export const deploy = (portalId: string) =>
  callApi(`/deploy/${portalId}`, 'POST');

export const deployAll = () =>
  callApi('/deploy/all', 'POST');

// ============================================================
// LOGS
// ============================================================

export const getLogs = (portalId: string, lines = 100) =>
  callApi(`/logs/${portalId}?lines=${lines}`);

// ============================================================
// CREDENTIALS
// ============================================================

export const getCredentials = () =>
  callApi('/credentials');

export const getPortalCredentials = (portalId: string) =>
  callApi(`/credentials/${portalId}`);

export const updateCredentials = (portalId: string, credentials: unknown) =>
  callApi(`/credentials/${portalId}`, 'PUT', credentials);

// ============================================================
// COMPANIES & USERS
// ============================================================

export const getCompanies = () =>
  callApi('/companies');

export const getCompany = (companyId: string) =>
  callApi(`/companies/${companyId}`);

export const getCompanyUsers = (companyId: string) =>
  callApi(`/companies/${companyId}/users`);

export const getPortalUsers = (portalId: string) =>
  callApi(`/portals/${portalId}/users`);
