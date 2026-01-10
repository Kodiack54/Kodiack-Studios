/**
 * Git Database - Consumer Registry
 * 
 * Import this to get stable endpoints for the git database API.
 * Other pages (Operations, DevTools, ProjectMgmt) should use these.
 */

export const GIT_DATABASE = {
  // Summary endpoint - for cards, buttons, status dots
  summary: '/git-database/api/summary',
  
  // Detail endpoint - for repo detail page with history
  repo: '/git-database/api/repo',
  
  // Family aggregation - for grouped cards (Chad, Jen, Susan as families)
  families: '/git-database/api/families',
  
  // Sync family action - syncs all instances in a family to same HEAD
  syncFamily: '/git-database/api/sync-family',
  
  // Registry CRUD - for managing repo configurations
  registry: '/git-database/api/registry',
  registryItem: (slug: string) => `/git-database/api/registry/${encodeURIComponent(slug)}`,
  
  // Schema tracking (Phase 2)
  schemaSummary: '/git-database/api/schema/summary',
  schemaDetail: '/git-database/api/schema/detail',
  
  // Drift history
  history: '/git-database/api/history',
} as const;

/**
 * Query parameter helpers
 */
export function buildSummaryUrl(params?: {
  group?: 'studio' | 'ai-team' | 'project';
  service_id?: string;
  project_slug?: string;
  state?: 'green' | 'orange' | 'red' | 'gray';
}): string {
  const url = new URL(GIT_DATABASE.summary, 'http://localhost');
  if (params?.group) url.searchParams.set('group', params.group);
  if (params?.service_id) url.searchParams.set('service_id', params.service_id);
  if (params?.project_slug) url.searchParams.set('project_slug', params.project_slug);
  if (params?.state) url.searchParams.set('state', params.state);
  return url.pathname + url.search;
}

export function buildRepoUrl(key: string): string {
  return `${GIT_DATABASE.repo}?key=${encodeURIComponent(key)}`;
}

export function buildFamiliesUrl(params?: {
  group?: 'ai-team' | 'studio-core';
  state?: 'green' | 'orange' | 'red' | 'gray';
}): string {
  const url = new URL(GIT_DATABASE.families, 'http://localhost');
  if (params?.group) url.searchParams.set('group', params.group);
  if (params?.state) url.searchParams.set('state', params.state);
  return url.pathname + url.search;
}

// Re-export types for consumers
export type {
  RepoPairSummary,
  RepoDetail,
  SyncState,
  SyncReason,
  RepoGroup,
  GitSummaryResponse,
  GitRepoResponse,
  SummaryFilters,
  FamilySummary,
  FamilySummaryResponse,
  InstanceState,
} from './types';
