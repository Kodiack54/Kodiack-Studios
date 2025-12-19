// Helpdesk API - Self-contained API for helpdesk section
// Connects to HelpDesk Service on port 7540

const HELPDESK_API_URL = process.env.HELPDESK_API_URL || 'http://localhost:7540';

async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${HELPDESK_API_URL}${endpoint}`;
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
// Health & Status
// ============================================

export async function getHealth() {
  return apiRequest('/health');
}

export async function getStatus() {
  return apiRequest('/status');
}

export async function getStats() {
  return apiRequest('/stats');
}

// ============================================
// System Tickets (Internal Dev Issues)
// ============================================

export async function getSystemTickets(params?: {
  status?: string;
  priority?: string;
  assignee?: string;
  project?: string;
  limit?: number;
  offset?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.priority) searchParams.set('priority', params.priority);
  if (params?.assignee) searchParams.set('assignee', params.assignee);
  if (params?.project) searchParams.set('project', params.project);
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset) searchParams.set('offset', params.offset.toString());

  const query = searchParams.toString();
  return apiRequest(`/system-tickets${query ? `?${query}` : ''}`);
}

export async function getSystemTicket(ticketId: string) {
  return apiRequest(`/system-tickets/${ticketId}`);
}

export async function createSystemTicket(ticket: {
  title: string;
  description: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  project: string;
  type: 'bug' | 'feature' | 'improvement' | 'task';
  assignee?: string;
  labels?: string[];
}) {
  return apiRequest('/system-tickets', {
    method: 'POST',
    body: JSON.stringify(ticket),
  });
}

export async function updateSystemTicket(ticketId: string, updates: {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  labels?: string[];
}) {
  return apiRequest(`/system-tickets/${ticketId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function closeSystemTicket(ticketId: string, resolution?: string) {
  return apiRequest(`/system-tickets/${ticketId}/close`, {
    method: 'POST',
    body: JSON.stringify({ resolution }),
  });
}

export async function addSystemTicketComment(ticketId: string, comment: string) {
  return apiRequest(`/system-tickets/${ticketId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ comment }),
  });
}

export async function getSystemTicketComments(ticketId: string) {
  return apiRequest(`/system-tickets/${ticketId}/comments`);
}

// ============================================
// User Tickets (Customer Support)
// User IDs follow prefix pattern: portal_user, nextbidder_user, nexttech_user, etc.
// ============================================

export async function getUserTickets(params?: {
  status?: string;
  priority?: string;
  category?: string;
  source_system?: string; // portal, nextbidder, nexttech, nexttask, sources
  user_id?: string; // e.g., portal_user_123, nextbidder_user_456
  limit?: number;
  offset?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.priority) searchParams.set('priority', params.priority);
  if (params?.category) searchParams.set('category', params.category);
  if (params?.source_system) searchParams.set('source_system', params.source_system);
  if (params?.user_id) searchParams.set('user_id', params.user_id);
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset) searchParams.set('offset', params.offset.toString());

  const query = searchParams.toString();
  return apiRequest(`/user-tickets${query ? `?${query}` : ''}`);
}

export async function getUserTicket(ticketId: string) {
  return apiRequest(`/user-tickets/${ticketId}`);
}

export async function createUserTicket(ticket: {
  title: string;
  description: string;
  category: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  source_system: 'portal' | 'nextbidder' | 'nexttech' | 'nexttask' | 'sources';
  user_id: string; // e.g., portal_user_123, nextbidder_user_456
  user_email: string;
  attachments?: string[];
}) {
  return apiRequest('/user-tickets', {
    method: 'POST',
    body: JSON.stringify(ticket),
  });
}

export async function updateUserTicket(ticketId: string, updates: {
  status?: string;
  priority?: string;
  assigned_to?: string;
  category?: string;
  internal_notes?: string;
}) {
  return apiRequest(`/user-tickets/${ticketId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function replyToUserTicket(ticketId: string, reply: {
  message: string;
  is_internal?: boolean;
}) {
  return apiRequest(`/user-tickets/${ticketId}/reply`, {
    method: 'POST',
    body: JSON.stringify(reply),
  });
}

export async function closeUserTicket(ticketId: string, resolution: string) {
  return apiRequest(`/user-tickets/${ticketId}/close`, {
    method: 'POST',
    body: JSON.stringify({ resolution }),
  });
}

export async function getUserTicketHistory(ticketId: string) {
  return apiRequest(`/user-tickets/${ticketId}/history`);
}

// ============================================
// Categories & Labels
// ============================================

export async function getCategories() {
  return apiRequest('/categories');
}

export async function getLabels() {
  return apiRequest('/labels');
}

export async function getProjects() {
  return apiRequest('/projects');
}

// ============================================
// Team & Assignment
// ============================================

export async function getTeamMembers() {
  return apiRequest('/team');
}

export async function getAssignableUsers() {
  return apiRequest('/assignable-users');
}

export async function assignTicket(ticketId: string, type: 'system' | 'user', assigneeId: string) {
  return apiRequest(`/${type}-tickets/${ticketId}/assign`, {
    method: 'POST',
    body: JSON.stringify({ assignee_id: assigneeId }),
  });
}

// ============================================
// Canned Responses
// ============================================

export async function getCannedResponses() {
  return apiRequest('/canned-responses');
}

export async function createCannedResponse(response: {
  title: string;
  content: string;
  category?: string;
}) {
  return apiRequest('/canned-responses', {
    method: 'POST',
    body: JSON.stringify(response),
  });
}

export async function updateCannedResponse(responseId: string, updates: {
  title?: string;
  content?: string;
  category?: string;
}) {
  return apiRequest(`/canned-responses/${responseId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteCannedResponse(responseId: string) {
  return apiRequest(`/canned-responses/${responseId}`, {
    method: 'DELETE',
  });
}
