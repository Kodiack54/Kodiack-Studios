'use client';

/**
 * UserContextProvider - GLOBAL SOURCE OF TRUTH
 *
 * Context is set by tab navigation (auto-flip hooks).
 * NO gate modal. NO popup. Just provides context state.
 */

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

export type ContextMode = 'project' | 'forge' | 'support' | 'planning' | 'other' | 'break';
export type ContextSource = 'universal' | 'studio' | 'autoflip' | 'timeclock' | 'manual';

export interface UserContext {
  id: string;
  user_id: string;
  pc_tag: string;
  mode: ContextMode;
  project_id: string | null;
  project_slug: string | null;
  project_name: string | null;
  dev_team: string | null;
  started_at: string;
  updated_at: string;
  ended_at: string | null;
  source: ContextSource;
  locked: boolean;
}

interface UserContextValue {
  // Current context state
  context: UserContext | null;
  isLoading: boolean;
  hasActiveContext: boolean;

  // Previous work mode (PROJECT or SUPPORT) - for returning from Forge/Planning
  previousWorkMode: { mode: ContextMode; projectId?: string; projectSlug?: string; projectName?: string } | null;

  // Actions
  fetchContext: () => Promise<void>;
  setContext: (params: SetContextParams) => Promise<boolean>;
  flipContext: (mode: ContextMode, projectId?: string, projectSlug?: string, projectName?: string, devTeam?: string) => Promise<boolean>;
  returnToPreviousWorkMode: () => Promise<boolean>;
  flipToSupportIfNeeded: () => Promise<boolean>;
  endContext: () => Promise<void>;

  // User identity (set on login)
  userId: string | null;
  pcTag: string | null;
  setUserIdentity: (userId: string, pcTag: string) => void;
}

interface SetContextParams {
  mode: ContextMode;
  project_id?: string | null;
  project_slug?: string | null;
  project_name?: string | null;
  dev_team?: string | null;
  source: ContextSource;
}

const UserContextContext = createContext<UserContextValue>({
  context: null,
  isLoading: true,
  hasActiveContext: false,
  previousWorkMode: null,
  fetchContext: async () => {},
  setContext: async () => false,
  flipContext: async () => false,
  returnToPreviousWorkMode: async () => false,
  flipToSupportIfNeeded: async () => false,
  endContext: async () => {},
  userId: null,
  pcTag: null,
  setUserIdentity: () => {},
});

export function UserContextProvider({ children }: { children: ReactNode }) {
  const [context, setContextState] = useState<UserContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [pcTag, setPcTag] = useState<string | null>(null);
  const [previousWorkMode, setPreviousWorkMode] = useState<{ mode: ContextMode; projectId?: string; projectSlug?: string; projectName?: string } | null>(null);

  const hasActiveContext = !!context;

  // Track previous work mode (PROJECT or SUPPORT) when switching to Forge/Planning
  useEffect(() => {
    if (context && (context.mode === 'project' || context.mode === 'support')) {
      setPreviousWorkMode({
        mode: context.mode,
        projectId: context.project_id || undefined,
        projectSlug: context.project_slug || undefined,
        projectName: context.project_name || undefined,
      });
    }
  }, [context]);

  const setUserIdentity = useCallback((newUserId: string, newPcTag: string) => {
    setUserId(newUserId);
    setPcTag(newPcTag);
  }, []);

  const fetchContext = useCallback(async () => {
    if (!userId || !pcTag) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/context?user_id=${userId}&pc_tag=${encodeURIComponent(pcTag)}`);
      const data = await res.json();

      if (data.success) {
        setContextState(data.context);
        // NO gate popup - just set context silently
      }
    } catch (error) {
      console.error('[UserContext] Failed to fetch context:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, pcTag]);

  const setContext = useCallback(async (params: SetContextParams): Promise<boolean> => {
    if (!userId || !pcTag) return false;

    try {
      const res = await fetch('/api/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          pc_tag: pcTag,
          ...params,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setContextState(data.context);
        return true;
      } else {
        console.error('[UserContext] Failed to set context:', data.error);
        return false;
      }
    } catch (error) {
      console.error('[UserContext] Error setting context:', error);
      return false;
    }
  }, [userId, pcTag]);

  // Convenience method for auto-flip (called by tab navigation hooks)
  const flipContext = useCallback(async (
    mode: ContextMode,
    projectId?: string,
    projectSlug?: string,
    projectName?: string,
    devTeam?: string
  ): Promise<boolean> => {
    return setContext({
      mode,
      project_id: projectId || null,
      project_slug: projectSlug || null,
      project_name: projectName || null,
      dev_team: devTeam || null,
      source: 'autoflip',
    });
  }, [setContext]);

  // Return to previous work mode (PROJECT or SUPPORT) when leaving Forge/Planning
  const returnToPreviousWorkMode = useCallback(async (): Promise<boolean> => {
    if (previousWorkMode) {
      return setContext({
        mode: previousWorkMode.mode,
        project_id: previousWorkMode.projectId || null,
        project_slug: previousWorkMode.projectSlug || null,
        project_name: previousWorkMode.projectName || null,
        source: 'autoflip',
      });
    }
    // Fallback to SUPPORT if no previous work mode
    return setContext({
      mode: 'support',
      source: 'autoflip',
    });
  }, [previousWorkMode, setContext]);

  // Flip to SUPPORT if currently in OTHER, FORGE, or PLANNING (for sidebar work tabs)
  const flipToSupportIfNeeded = useCallback(async (): Promise<boolean> => {
    console.log('[flipToSupportIfNeeded] Current context:', context?.mode, 'previousWorkMode:', previousWorkMode);

    // No context yet - flip to support
    if (!context) {
      console.log('[flipToSupportIfNeeded] No context, flipping to support');
      return setContext({
        mode: 'support',
        source: 'autoflip',
      });
    }

    // If already in PROJECT or SUPPORT, no flip needed - stay in current mode
    if (context.mode === 'project' || context.mode === 'support') {
      console.log('[flipToSupportIfNeeded] Already in project/support, no flip needed');
      return true;
    }

    // If in FORGE or PLANNING, return to previous work mode (project or support)
    if (context.mode === 'forge' || context.mode === 'planning') {
      console.log('[flipToSupportIfNeeded] In forge/planning, returning to previous work mode');
      return returnToPreviousWorkMode();
    }

    // If in OTHER or BREAK, flip to SUPPORT
    console.log('[flipToSupportIfNeeded] In other/break, flipping to support');
    return setContext({
      mode: 'support',
      source: 'autoflip',
    });
  }, [context, previousWorkMode, returnToPreviousWorkMode, setContext]);

  const endContext = useCallback(async () => {
    if (!userId || !pcTag) return;

    try {
      const res = await fetch(`/api/context?user_id=${userId}&pc_tag=${encodeURIComponent(pcTag)}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        setContextState(null);
      }
    } catch (error) {
      console.error('[UserContext] Error ending context:', error);
    }
  }, [userId, pcTag]);

  // Fetch context when user identity is set
  useEffect(() => {
    if (userId && pcTag) {
      fetchContext();
    }
  }, [userId, pcTag, fetchContext]);

  return (
    <UserContextContext.Provider value={{
      context,
      isLoading,
      hasActiveContext,
      previousWorkMode,
      fetchContext,
      setContext,
      flipContext,
      returnToPreviousWorkMode,
      flipToSupportIfNeeded,
      endContext,
      userId,
      pcTag,
      setUserIdentity,
    }}>
      {children}
    </UserContextContext.Provider>
  );
}

export function useUserContext() {
  const context = useContext(UserContextContext);
  if (!context) {
    throw new Error('useUserContext must be used within a UserContextProvider');
  }
  return context;
}

// Mode display helpers
export const MODE_LABELS: Record<ContextMode, string> = {
  project: 'Project',
  forge: 'Forge',
  support: 'Support',
  planning: 'Planning',
  other: 'Other',
  break: 'Break',
};
