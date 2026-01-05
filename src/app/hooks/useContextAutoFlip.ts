'use client';

/**
 * useContextAutoFlip - Auto-flip context when entering different areas
 *
 * UI is the event source. Every navigation that changes what the dev
 * is doing fires a context update.
 *
 * Usage:
 *   useContextAutoFlip('forge');  // Auto-flips to forge mode
 *   useContextAutoFlip('helpdesk');  // Auto-flips to helpdesk mode
 *   useContextAutoFlip('project', projectId, projectSlug, devTeam);  // Auto-flips to project
 */

import { useEffect, useRef } from 'react';
import { useUserContext, ContextMode } from '@/app/contexts/UserContextProvider';

export function useContextAutoFlip(
  targetMode: ContextMode,
  projectId?: string,
  projectSlug?: string,
  projectName?: string,
  devTeam?: string
) {
  const { context, flipContext, hasActiveContext, userId, pcTag } = useUserContext();
  const hasFlipped = useRef(false);

  useEffect(() => {
    // Don't flip if:
    // - No user identity yet
    // - Already flipped this mount
    // - Already in the correct mode
    if (!userId || !pcTag) return;
    if (hasFlipped.current) return;

    // Check if we need to flip
    const needsFlip = (() => {
      if (!hasActiveContext) return true;
      if (!context) return true;

      // If target is project mode, check if same project
      if (targetMode === 'project') {
        if (context.mode !== 'project') return true;
        if (context.project_id !== projectId) return true;
        // Optionally check dev_team too
        return false;
      }

      // For non-project modes, just check if mode matches
      return context.mode !== targetMode;
    })();

    if (needsFlip) {
      hasFlipped.current = true;

      if (targetMode === 'project' && projectId) {
        flipContext('project', projectId, projectSlug, projectName, devTeam);
      } else if (targetMode !== 'project') {
        flipContext(targetMode);
      }
    }
  }, [
    context,
    flipContext,
    hasActiveContext,
    targetMode,
    projectId,
    projectSlug,
    projectName,
    devTeam,
    userId,
    pcTag,
  ]);

  // Reset flip flag when target changes (e.g., switching projects)
  useEffect(() => {
    hasFlipped.current = false;
  }, [targetMode, projectId]);
}

/**
 * Shorthand hooks for common modes
 */
export function useForgeAutoFlip() {
  useContextAutoFlip('forge');
}

export function useSupportAutoFlip() {
  useContextAutoFlip('support');
}

export function usePlanningAutoFlip() {
  useContextAutoFlip('planning');
}

export function useOtherAutoFlip() {
  useContextAutoFlip('other');
}

export function useBreakAutoFlip() {
  useContextAutoFlip('break');
}

// Legacy aliases (will be removed)
export function useHelpdeskAutoFlip() {
  useContextAutoFlip('support');
}

export function useOpsAutoFlip() {
  useContextAutoFlip('support');
}

export function useRoadmapAutoFlip() {
  useContextAutoFlip('planning');
}

/**
 * Project auto-flip with project details
 */
export function useProjectAutoFlip(
  projectId: string | undefined,
  projectSlug?: string,
  projectName?: string,
  devTeam?: string
) {
  useContextAutoFlip('project', projectId, projectSlug, projectName, devTeam);
}
