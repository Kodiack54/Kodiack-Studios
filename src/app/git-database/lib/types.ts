/**
 * Git Database - Shared Type Definitions
 * This is the DATA CONTRACT for all consumers (Operations, DevTools, ProjectMgmt)
 */

// =============================================================================
// CORE TYPES
// =============================================================================

export type SyncState = 'green' | 'yellow' | 'orange' | 'red' | 'gray';
export type RepoGroup = 'studio' | 'ai-team' | 'project';
export type RepoOrigin = 'server' | 'pc' | 'origin';

export type SyncReason = 
  | 'synced'           // green: all good
  | 'hash_mismatch'    // orange: server/pc heads differ
  | 'server_dirty'     // orange: server has uncommitted changes
  | 'pc_dirty'         // orange: pc has uncommitted changes
  | 'ahead'            // orange: local ahead of remote
  | 'behind'           // orange: local behind remote
  | 'diverged'         // orange: both ahead and behind
  | 'wrong_branch'     // orange: not on expected branch
  | 'server_offline'   // gray: no server report recently
  | 'pc_offline'       // gray: no pc report recently
  | 'server_missing'   // gray: repo not on server
  | 'pc_missing'       // gray: repo not on pc
  | 'origin_unreachable' // orange: can't reach remote
  | 'awaiting_config'   // yellow: discovered but not configured
  | 'missing_paths';    // orange: configured but no server/pc path

// =============================================================================
// NODE STATE (shared between server and pc)
// =============================================================================

export interface NodeGitState {
  node_id: string;
  path?: string;
  branch: string;
  head: string;           // full SHA
  head_short: string;     // 7-char
  dirty: boolean;
  ahead: number;
  behind: number;
  last_commit_msg?: string;
  last_commit_time?: string;  // ISO
  last_seen: string;          // ISO timestamp of last report
}

// =============================================================================
// SUMMARY (for cards, buttons, status dots)
// =============================================================================

export interface RepoPairSummary {
  key: string;              // stable ID: repo_id or generated key
  repo: string;             // "kodiack-dashboard-5500"
  repo_id: string;          // canonical matching key
  group: RepoGroup;
  service_id?: string;      // maps to ops service (dashboard-5500, chad-5401)
  project_slug?: string;    // if repo belongs to a project

  server?: NodeGitState;
  pc?: NodeGitState & { node_id: 'user-pc' };

  // Precomputed for UI + other pages
  sync: {
    state: SyncState;
    reasons: SyncReason[];
  };

  // Registry metadata (from ops.repo_registry)
  registry?: {
    display_name?: string;
    github_url?: string;
    notes?: string;
    is_active: boolean;
    auto_discovered: boolean;
    is_ai_team?: boolean;
  };

  updated_at: string;  // ISO
}

// =============================================================================
// DETAIL (for repo detail page)
// =============================================================================

export interface HistoryEntry {
  origin: RepoOrigin;
  timestamp: string;
  head: string;
  head_short: string;
  branch: string;
  dirty: boolean;
  ahead: number;
  behind: number;
  message?: string;
}

export interface DeployEntry {
  timestamp: string;
  by?: string;
  head: string;
  head_short: string;
  message?: string;
  service_id?: string;
}

export interface RepoDetail extends RepoPairSummary {
  history: HistoryEntry[];
  deploys?: DeployEntry[];
}

// =============================================================================
// API RESPONSE SHAPES
// =============================================================================

export interface GitSummaryResponse {
  success: boolean;
  repos: RepoPairSummary[];
  counts: {
    total: number;
    green: number;
    yellow: number;
    orange: number;
    red: number;
    gray: number;
  };
  timestamp: string;
}

export interface GitRepoResponse {
  success: boolean;
  repo: RepoDetail | null;
  error?: string;
}

// =============================================================================
// FILTER OPTIONS
// =============================================================================

export interface SummaryFilters {
  group?: RepoGroup;
  service_id?: string;
  project_slug?: string;
  state?: SyncState;
  active_only?: boolean;
}

// =============================================================================
// OFFLINE THRESHOLDS (centralized config)
// =============================================================================

export const OFFLINE_THRESHOLDS = {
  PC_OFFLINE_MS: 90_000,      // 90 seconds
  SERVER_OFFLINE_MS: 90_000,  // 90 seconds
  STALE_MS: 300_000,          // 5 minutes
} as const;

// =============================================================================
// BACKWARD COMPATIBILITY (for existing components)
// =============================================================================

// Alias for existing code that uses DriftStatus
export type DriftStatus = SyncState;

// Legacy types used by GitDriftBoard and GitDetailsModal
export interface NodeState {
  node_id: string;
  last_seen: string;
  repos: Array<{
    repo: string;
    path?: string;
    branch: string;
    local_sha: string;
    is_dirty: boolean;
    ahead: number;
    behind: number;
    drift_status: DriftStatus;
    drift_reasons: string[];
    last_commit_msg?: string;
    last_commit_time?: string;
  }>;
}

export interface PCGitState {
  node_id: 'user-pc';
  last_seen: string;
  repos: Array<{
    repo: string;
    path?: string;
    branch: string;
    head: string;
    dirty: boolean;
    ahead: number;
    behind: number;
    last_commit_msg?: string;
    last_commit_time?: string;
  }>;
}

export interface GitDriftResponse {
  error?: string;
  success: boolean;
  nodes: NodeState[];
  pc: PCGitState | null;
  timestamp: string;
}

// =============================================================================
// FAMILY TYPES (aggregated view of related repos)
// =============================================================================

export interface InstanceState {
  service_id: string;
  repo_path: string;
  node_id?: string;
  branch?: string;
  head?: string;
  head_short?: string;
  dirty?: boolean;
  ahead?: number;
  behind?: number;
  last_commit_msg?: string;
  last_seen?: string;
  status: 'online' | 'offline' | 'unknown';
}

export interface FamilySummary {
  family_key: string;
  display_name: string;
  instance_group: string;  // 'ai-team' | 'studio-core' | 'project'
  is_ai_team: boolean;
  
  // Desired state (from primary or majority)
  desired_head?: string;
  desired_head_short?: string;
  desired_branch?: string;
  
  // All instances with their current state
  instances: InstanceState[];
  instance_count: number;
  
  // Aggregated sync status
  sync: {
    state: SyncState;
    reasons: SyncReason[];
    in_sync_count: number;
    out_of_sync_instances: string[];  // service_ids that don't match desired
    dirty_instances: string[];         // service_ids that are dirty
    offline_instances: string[];       // service_ids that are offline
  };
  
  // Registry metadata
  auto_update: boolean;
  notes?: string;
  github_url?: string;
  
  updated_at: string;
}

export interface FamilySummaryResponse {
  success: boolean;
  families: FamilySummary[];
  counts: {
    total: number;
    green: number;
    yellow: number;
    orange: number;
    red: number;
    gray: number;
  };
  timestamp: string;
}
