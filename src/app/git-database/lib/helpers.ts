import { DriftStatus } from './types';

// Normalize git state to status color
export function normalizeGitState(
  serverState: { sha: string; dirty: boolean; ahead: number; behind: number } | null,
  pcState: { sha: string; dirty: boolean; ahead: number; behind: number } | null
): { status: DriftStatus; reasons: string[] } {
  const reasons: string[] = [];

  // Gray if one side missing
  if (!serverState || !pcState) {
    return { status: 'gray', reasons: ['missing_data'] };
  }

  // Check for dirty
  if (serverState.dirty) reasons.push('server_dirty');
  if (pcState.dirty) reasons.push('pc_dirty');

  // Check for SHA mismatch
  if (serverState.sha !== pcState.sha) {
    if (serverState.ahead > 0 && serverState.behind > 0) {
      reasons.push('diverged');
    } else if (serverState.ahead > 0) {
      reasons.push('server_ahead');
    } else if (serverState.behind > 0) {
      reasons.push('server_behind');
    } else {
      reasons.push('sha_mismatch');
    }
  }

  // Determine status
  if (reasons.length === 0) {
    return { status: 'green', reasons: [] };
  }

  // Red for critical issues (not used yet, reserved for prod)
  return { status: 'orange', reasons };
}

// Badge for drift state
export function badgeForState(status: DriftStatus): { label: string; color: string } {
  switch (status) {
    case 'green':
      return { label: 'SYNC', color: 'bg-green-600' };
    case 'orange':
      return { label: 'DRIFT', color: 'bg-orange-600' };
    case 'red':
      return { label: 'CRITICAL', color: 'bg-red-600' };
    default:
      return { label: 'UNKNOWN', color: 'bg-gray-600' };
  }
}

// Format ahead/behind display
export function formatBehindAhead(ahead: number, behind: number): string {
  if (ahead === 0 && behind === 0) return 'In sync';
  const parts: string[] = [];
  if (ahead > 0) parts.push(`+${ahead} ahead`);
  if (behind > 0) parts.push(`-${behind} behind`);
  return parts.join(', ');
}

// Human-readable drift reason
export function humanizeReason(reason: string): string {
  const map: Record<string, string> = {
    server_dirty: 'Server has uncommitted changes',
    pc_dirty: 'PC has uncommitted changes',
    sha_mismatch: 'Commits differ',
    server_ahead: 'Server is ahead of origin',
    server_behind: 'Server is behind origin',
    diverged: 'Branches have diverged',
    missing_data: 'No data available',
    dirty: 'Uncommitted changes',
  };
  return map[reason] || reason;
}

// Fetch git database status (client helper)
export async function getGitDatabaseStatus() {
  const res = await fetch('/git-database/api/status');
  return res.json();
}
