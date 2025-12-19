// Calendar API - Self-contained API for calendar section
// Handles scheduler, time clock, time off, sick time, and timesheets

const DASHBOARD_API_URL = process.env.DASHBOARD_API_URL || 'http://localhost:7503';

async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${DASHBOARD_API_URL}${endpoint}`;
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
// Scheduler / Events
// ============================================

export async function getEvents(params?: {
  start_date?: string;
  end_date?: string;
  user_id?: string;
  type?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.start_date) searchParams.set('start_date', params.start_date);
  if (params?.end_date) searchParams.set('end_date', params.end_date);
  if (params?.user_id) searchParams.set('user_id', params.user_id);
  if (params?.type) searchParams.set('type', params.type);

  const query = searchParams.toString();
  return apiRequest(`/calendar/events${query ? `?${query}` : ''}`);
}

export async function getEvent(eventId: string) {
  return apiRequest(`/calendar/events/${eventId}`);
}

export async function createEvent(event: {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  type: 'meeting' | 'task' | 'reminder' | 'deadline' | 'other';
  all_day?: boolean;
  attendees?: string[];
  location?: string;
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    end_date?: string;
  };
}) {
  return apiRequest('/calendar/events', {
    method: 'POST',
    body: JSON.stringify(event),
  });
}

export async function updateEvent(eventId: string, updates: Partial<{
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  type: string;
  all_day: boolean;
  attendees: string[];
  location: string;
}>) {
  return apiRequest(`/calendar/events/${eventId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteEvent(eventId: string) {
  return apiRequest(`/calendar/events/${eventId}`, {
    method: 'DELETE',
  });
}

// ============================================
// Time Clock
// ============================================

export async function getTimeClockStatus(userId?: string) {
  const query = userId ? `?user_id=${userId}` : '';
  return apiRequest(`/time-clock/status${query}`);
}

export async function clockIn(userId: string, notes?: string) {
  return apiRequest('/time-clock/in', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, notes }),
  });
}

export async function clockOut(userId: string, notes?: string) {
  return apiRequest('/time-clock/out', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, notes }),
  });
}

export async function startBreak(userId: string) {
  return apiRequest('/time-clock/break/start', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  });
}

export async function endBreak(userId: string) {
  return apiRequest('/time-clock/break/end', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  });
}

export async function getTimeClockHistory(params?: {
  user_id?: string;
  start_date?: string;
  end_date?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.user_id) searchParams.set('user_id', params.user_id);
  if (params?.start_date) searchParams.set('start_date', params.start_date);
  if (params?.end_date) searchParams.set('end_date', params.end_date);

  const query = searchParams.toString();
  return apiRequest(`/time-clock/history${query ? `?${query}` : ''}`);
}

// ============================================
// Time Off Requests
// ============================================

export async function getTimeOffRequests(params?: {
  user_id?: string;
  status?: string;
  type?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.user_id) searchParams.set('user_id', params.user_id);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.type) searchParams.set('type', params.type);

  const query = searchParams.toString();
  return apiRequest(`/time-off/requests${query ? `?${query}` : ''}`);
}

export async function getTimeOffRequest(requestId: string) {
  return apiRequest(`/time-off/requests/${requestId}`);
}

export async function createTimeOffRequest(request: {
  type: 'vacation' | 'sick' | 'personal' | 'bereavement' | 'other';
  start_date: string;
  end_date: string;
  reason?: string;
  half_day?: boolean;
}) {
  return apiRequest('/time-off/requests', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function approveTimeOffRequest(requestId: string, notes?: string) {
  return apiRequest(`/time-off/requests/${requestId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });
}

export async function denyTimeOffRequest(requestId: string, reason: string) {
  return apiRequest(`/time-off/requests/${requestId}/deny`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function cancelTimeOffRequest(requestId: string) {
  return apiRequest(`/time-off/requests/${requestId}/cancel`, {
    method: 'POST',
  });
}

export async function getTimeOffBalance(userId?: string) {
  const query = userId ? `?user_id=${userId}` : '';
  return apiRequest(`/time-off/balance${query}`);
}

// ============================================
// Timesheets
// ============================================

export async function getTimesheets(params?: {
  user_id?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.user_id) searchParams.set('user_id', params.user_id);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.start_date) searchParams.set('start_date', params.start_date);
  if (params?.end_date) searchParams.set('end_date', params.end_date);

  const query = searchParams.toString();
  return apiRequest(`/timesheets${query ? `?${query}` : ''}`);
}

export async function getTimesheet(timesheetId: string) {
  return apiRequest(`/timesheets/${timesheetId}`);
}

export async function createTimesheet(timesheet: {
  week_start: string;
  entries: Array<{
    date: string;
    hours: number;
    project?: string;
    description?: string;
  }>;
}) {
  return apiRequest('/timesheets', {
    method: 'POST',
    body: JSON.stringify(timesheet),
  });
}

export async function updateTimesheet(timesheetId: string, entries: Array<{
  date: string;
  hours: number;
  project?: string;
  description?: string;
}>) {
  return apiRequest(`/timesheets/${timesheetId}`, {
    method: 'PUT',
    body: JSON.stringify({ entries }),
  });
}

export async function submitTimesheet(timesheetId: string) {
  return apiRequest(`/timesheets/${timesheetId}/submit`, {
    method: 'POST',
  });
}

export async function approveTimesheet(timesheetId: string, notes?: string) {
  return apiRequest(`/timesheets/${timesheetId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });
}

export async function rejectTimesheet(timesheetId: string, reason: string) {
  return apiRequest(`/timesheets/${timesheetId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

// ============================================
// Team Calendar
// ============================================

export async function getTeamCalendar(params?: {
  start_date?: string;
  end_date?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.start_date) searchParams.set('start_date', params.start_date);
  if (params?.end_date) searchParams.set('end_date', params.end_date);

  const query = searchParams.toString();
  return apiRequest(`/calendar/team${query ? `?${query}` : ''}`);
}

export async function getTeamMembers() {
  return apiRequest('/team/members');
}
