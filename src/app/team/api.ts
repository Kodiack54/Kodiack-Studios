// Team API - Self-contained API for team management section
// Handles permissions, roles, team members, and reporting

// Get base URL for API calls (needed for server-side rendering)
function getBaseUrl() {
  // Server-side: use localhost with PORT
  if (typeof window === 'undefined') {
    const port = process.env.PORT || '7500';
    return `http://localhost:${port}`;
  }
  // Client-side: use relative URL
  return '';
}

async function apiRequest(endpoint: string, options: RequestInit = {}) {
  // Map /team/* to /api/team/*
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api${endpoint}`;
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
    throw new Error(error.error || `API Error: ${res.status}`);
  }

  return res.json();
}

// ============================================
// Team Members
// ============================================

export async function getTeamMembers(params?: {
  role?: string;
  status?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.role) searchParams.set('role', params.role);
  if (params?.status) searchParams.set('status', params.status);

  const query = searchParams.toString();
  return apiRequest(`/team/members${query ? `?${query}` : ''}`);
}

export async function getTeamMember(memberId: string) {
  return apiRequest(`/team/members/${memberId}`);
}

export async function createTeamMember(member: {
  name: string;
  email: string;
  role: string;
  permissions?: string[];
  projects?: string[];
}) {
  return apiRequest('/team/members', {
    method: 'POST',
    body: JSON.stringify(member),
  });
}

export async function updateTeamMember(memberId: string, updates: {
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  permissions?: string[];
  projects?: string[];
}) {
  return apiRequest(`/team/members/${memberId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deactivateTeamMember(memberId: string) {
  return apiRequest(`/team/members/${memberId}/deactivate`, {
    method: 'POST',
  });
}

export async function reactivateTeamMember(memberId: string) {
  return apiRequest(`/team/members/${memberId}/reactivate`, {
    method: 'POST',
  });
}

// ============================================
// Roles
// ============================================

export async function getRoles() {
  return apiRequest('/team/roles');
}

export async function getRole(roleId: string) {
  return apiRequest(`/team/roles/${roleId}`);
}

export async function createRole(role: {
  name: string;
  description?: string;
  permissions: string[];
  level: number;
}) {
  return apiRequest('/team/roles', {
    method: 'POST',
    body: JSON.stringify(role),
  });
}

export async function updateRole(roleId: string, updates: {
  name?: string;
  description?: string;
  permissions?: string[];
  level?: number;
}) {
  return apiRequest(`/team/roles/${roleId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteRole(roleId: string) {
  return apiRequest(`/team/roles/${roleId}`, {
    method: 'DELETE',
  });
}

// ============================================
// Permissions
// ============================================

export async function getPermissions() {
  return apiRequest('/team/permissions');
}

export async function getPermissionGroups() {
  return apiRequest('/team/permissions/groups');
}

export async function getUserPermissions(userId: string) {
  return apiRequest(`/team/members/${userId}/permissions`);
}

export async function updateUserPermissions(userId: string, permissions: string[]) {
  return apiRequest(`/team/members/${userId}/permissions`, {
    method: 'PUT',
    body: JSON.stringify({ permissions }),
  });
}

// ============================================
// Project Access
// ============================================

export async function getProjectAccess(projectId: string) {
  return apiRequest(`/team/projects/${projectId}/access`);
}

export async function grantProjectAccess(projectId: string, userId: string, level: string) {
  return apiRequest(`/team/projects/${projectId}/access`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, level }),
  });
}

export async function revokeProjectAccess(projectId: string, userId: string) {
  return apiRequest(`/team/projects/${projectId}/access/${userId}`, {
    method: 'DELETE',
  });
}

// ============================================
// Team Reports
// ============================================

export async function getTeamStats() {
  return apiRequest('/team/stats');
}

export async function getActivityReport(params?: {
  start_date?: string;
  end_date?: string;
  user_id?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.start_date) searchParams.set('start_date', params.start_date);
  if (params?.end_date) searchParams.set('end_date', params.end_date);
  if (params?.user_id) searchParams.set('user_id', params.user_id);

  const query = searchParams.toString();
  return apiRequest(`/team/reports/activity${query ? `?${query}` : ''}`);
}

export async function getProductivityReport(params?: {
  start_date?: string;
  end_date?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.start_date) searchParams.set('start_date', params.start_date);
  if (params?.end_date) searchParams.set('end_date', params.end_date);

  const query = searchParams.toString();
  return apiRequest(`/team/reports/productivity${query ? `?${query}` : ''}`);
}

export async function getAuditLog(params?: {
  user_id?: string;
  action?: string;
  limit?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.user_id) searchParams.set('user_id', params.user_id);
  if (params?.action) searchParams.set('action', params.action);
  if (params?.limit) searchParams.set('limit', params.limit.toString());

  const query = searchParams.toString();
  return apiRequest(`/team/audit-log${query ? `?${query}` : ''}`);
}
