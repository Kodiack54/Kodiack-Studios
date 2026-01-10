/**
 * Git Database - Selectors
 * Centralized logic for computing sync state, matching repos, and filtering
 * 
 * ALL sync logic lives here - no other page should implement their own
 */

import {
  SyncState,
  SyncReason,
  RepoGroup,
  NodeGitState,
  RepoPairSummary,
  SummaryFilters,
  OFFLINE_THRESHOLDS,
} from './types';

// =============================================================================
// OFFLINE DETECTION
// =============================================================================

export function isOffline(lastSeen: string | undefined, thresholdMs: number): boolean {
  if (!lastSeen) return true;
  const lastSeenTime = new Date(lastSeen).getTime();
  const now = Date.now();
  return (now - lastSeenTime) > thresholdMs;
}

export function isServerOffline(server?: NodeGitState): boolean {
  return !server || isOffline(server.last_seen, OFFLINE_THRESHOLDS.SERVER_OFFLINE_MS);
}

export function isPcOffline(pc?: NodeGitState): boolean {
  return !pc || isOffline(pc.last_seen, OFFLINE_THRESHOLDS.PC_OFFLINE_MS);
}

// =============================================================================
// SYNC STATE COMPUTATION
// =============================================================================

export function computeSyncState(
  server?: NodeGitState,
  pc?: NodeGitState
): { state: SyncState; reasons: SyncReason[] } {
  const reasons: SyncReason[] = [];

  // Check offline status first
  const serverOffline = isServerOffline(server);
  const pcOffline = isPcOffline(pc);

  if (serverOffline && pcOffline) {
    return { state: 'gray', reasons: ['server_offline', 'pc_offline'] };
  }

  if (serverOffline && !pc) {
    return { state: 'gray', reasons: ['server_missing', 'pc_missing'] };
  }

  if (serverOffline) {
    reasons.push('server_offline');
  }

  if (pcOffline) {
    reasons.push('pc_offline');
  }

  // If one side is offline/missing, we can still report on the other
  if (!server && pc) {
    reasons.push('server_missing');
  }
  if (!pc && server) {
    reasons.push('pc_missing');
  }

  // Check dirty status
  if (server?.dirty) {
    reasons.push('server_dirty');
  }
  if (pc?.dirty) {
    reasons.push('pc_dirty');
  }

  // Check hash mismatch (only if both sides have data)
  if (server && pc && server.head !== pc.head) {
    reasons.push('hash_mismatch');
  }

  // Check ahead/behind (relative to origin)
  if (server) {
    if (server.ahead > 0 && server.behind > 0) {
      reasons.push('diverged');
    } else if (server.ahead > 0) {
      reasons.push('ahead');
    } else if (server.behind > 0) {
      reasons.push('behind');
    }
  }

  // Determine final state
  if (reasons.length === 0) {
    return { state: 'green', reasons: ['synced'] };
  }

  // Gray if offline issues only
  if (reasons.every(r => r.includes('offline') || r.includes('missing'))) {
    return { state: 'gray', reasons };
  }

  // Orange for most issues
  return { state: 'orange', reasons };
}

// =============================================================================
// GROUP DETECTION
// =============================================================================

const AI_TEAM_PREFIXES = [
  'ai-chad', 'ai-jen', 'ai-susan', 'ai-ryan', 
  'ai-clair', 'ai-jason', 'ai-mike', 'ai-tiffany'
];

export function detectGroup(repoName: string, projectSlug?: string): RepoGroup {
  const lower = repoName.toLowerCase();
  
  // AI team members
  if (AI_TEAM_PREFIXES.some(prefix => lower.startsWith(prefix))) {
    return 'ai-team';
  }
  
  // If associated with a project
  if (projectSlug) {
    return 'project';
  }
  
  return 'studio';
}

// =============================================================================
// SERVICE ID EXTRACTION
// =============================================================================

export function extractServiceId(repoName: string): string | undefined {
  // Map common repo names to service IDs
  const serviceMap: Record<string, string> = {
    'kodiack-dashboard-5500': 'dashboard-5500',
    'ai-chad-5401': 'chad-5401',
    'ai-jen-5402': 'jen-5402',
    'ai-susan-5403': 'susan-5403',
    'ai-clair-5404': 'clair-5404',
    'ai-mike-5405': 'mike-5405',
    'ai-tiffany-5406': 'tiffany-5406',
    'ai-ryan-5407': 'ryan-5407',
    'ai-jason-5408': 'jason-5408',
    'terminal-server-5400': 'terminal-5400',
    'transcripts-9500': 'router-9500',
    'ops-9200': 'ops-9200',
    'ops-9400-canonizer': 'canonizer-9400',
    'ops-9401-node-sensor': 'node-sensor-9401',
    'ops-9402-git-origin': 'git-origin-9402',
    'ops-9403-schema-tracker': 'schema-tracker-9403',
  };

  return serviceMap[repoName] || undefined;
}

// =============================================================================
// REPO MATCHING
// =============================================================================

/**
 * Generate a stable key for a repo
 * This is the canonical identifier used for matching server↔pc
 */
export function generateRepoKey(repoName: string): string {
  // Normalize: lowercase, remove common prefixes/suffixes
  return repoName.toLowerCase().trim();
}

/**
 * Match server repos with PC repos by repo_id
 */
export function matchRepoPairs(
  serverRepos: Array<{ repo: string; node_id: string; [key: string]: any }>,
  pcRepos: Array<{ repo: string; [key: string]: any }>
): Map<string, { server?: any; pc?: any }> {
  const pairs = new Map<string, { server?: any; pc?: any }>();

  // Add all server repos
  for (const repo of serverRepos) {
    const key = generateRepoKey(repo.repo);
    pairs.set(key, { server: repo });
  }

  // Match PC repos
  for (const repo of pcRepos) {
    const key = generateRepoKey(repo.repo);
    const existing = pairs.get(key);
    if (existing) {
      existing.pc = repo;
    } else {
      pairs.set(key, { pc: repo });
    }
  }

  return pairs;
}

// =============================================================================
// FILTERING
// =============================================================================

export function applyFilters(
  repos: RepoPairSummary[],
  filters: SummaryFilters
): RepoPairSummary[] {
  let filtered = [...repos];

  if (filters.group) {
    filtered = filtered.filter(r => r.group === filters.group);
  }

  if (filters.service_id) {
    filtered = filtered.filter(r => r.service_id === filters.service_id);
  }

  if (filters.project_slug) {
    filtered = filtered.filter(r => r.project_slug === filters.project_slug);
  }

  if (filters.state) {
    filtered = filtered.filter(r => r.sync.state === filters.state);
  }

  if (filters.active_only !== false) {
    filtered = filtered.filter(r => r.registry?.is_active !== false);
  }

  return filtered;
}

// =============================================================================
// HELPERS
// =============================================================================

export function shortenSha(sha: string | undefined): string {
  return sha?.slice(0, 7) || '';
}

export function countByState(repos: RepoPairSummary[]): Record<SyncState, number> {
  const counts: Record<SyncState, number> = { green: 0, yellow: 0, orange: 0, red: 0, gray: 0 };
  for (const repo of repos) {
    counts[repo.sync.state]++;
  }
  return counts;
}
