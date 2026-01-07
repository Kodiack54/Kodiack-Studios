'use client';

/**
 * UserContextProvider - Context Contract v1.0
 *
 * GLOBAL SOURCE OF TRUTH for what the user is doing.
 *
 * Core concept:
 * - Project is "sticky" (set by dropdown, persists across tabs)
 * - Mode is "fluid" (derived from current route)
 * - System tabs (support/servers/admin) force Studios Platform
 * - Heartbeat re-asserts context every 2 minutes
 *
 * Chad normalizes all terminals to 'studio-terminals' for matching.
 */

import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo, ReactNode } from 'react';
import { usePathname } from 'next/navigation';

export type ContextMode = 'project' | 'forge' | 'support' | 'planning' | 'other' | 'break';
export type ContextSource = 'universal' | 'studio' | 'autoflip' | 'timeclock' | 'manual';
export type EventType = 'flip' | 'heartbeat';

// Constants for Context Contract v1.0
// Routes that force mode (others inherit based on whether project is selected)
const SUPPORT_ROUTES = ['/servers', '/dev-controls', '/helpdesk', '/admin', '/security'];
const FORGE_ROUTES = ['/the-forge', '/forge'];
const PLANNING_ROUTES = ['/roadmap', '/planning'];
// Routes that inherit mode (project if stickyProject set, else support)
const INHERIT_ROUTES = ['/session-logs', '/ai-team', '/terminal', '/calendar', '/dashboard', '/studio', '/project-management', '/team', '/settings', '/credentials'];
// System routes force effectiveProject to Studios Platform
const SYSTEM_ROUTES = ['/servers', '/dev-controls', '/helpdesk', '/admin', '/security'];
const STUDIOS_PLATFORM_ID = '00000000-0000-0000-0000-000000000001'; // Studios Platform UUID
const STUDIOS_PLATFORM_SLUG = 'studios';
const STUDIOS_PLATFORM_NAME = 'Studios Platform';
const HEARTBEAT_INTERVAL = 120_000; // 2 minutes

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

// Sticky project info (set by dropdown only)
export interface StickyProject {
  id: string;
  slug: string;
  name: string;
}

interface UserContextValue {
  // Current context state
  context: UserContext | null;
  isLoading: boolean;
  hasActiveContext: boolean;

  // Context Contract v1.0: Sticky project (set by dropdown) vs Effective project (computed)
  stickyProject: StickyProject | null;
  effectiveProject: StickyProject | null;
  resolvedMode: ContextMode;
  isSystemTab: boolean;

  // Previous work mode (PROJECT or SUPPORT) - for returning from Forge/Planning
  previousWorkMode: { mode: ContextMode; projectId?: string; projectSlug?: string; projectName?: string } | null;

  // Actions
  fetchContext: () => Promise<void>;
  setContext: (params: SetContextParams) => Promise<boolean>;
  flipContext: (mode: ContextMode, projectId?: string, projectSlug?: string, projectName?: string, devTeam?: string) => Promise<boolean>;
  returnToPreviousWorkMode: () => Promise<boolean>;
  flipToSupportIfNeeded: () => Promise<boolean>;
  endContext: () => Promise<void>;

  // Context Contract v1.0: Set sticky project from dropdown
  setStickyProject: (project: StickyProject | null) => void;

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
  event_type?: EventType;
  meta?: Record<string, unknown>;
}

const UserContextContext = createContext<UserContextValue>({
  context: null,
  isLoading: true,
  hasActiveContext: false,
  stickyProject: null,
  effectiveProject: null,
  resolvedMode: 'project',
  isSystemTab: false,
  previousWorkMode: null,
  fetchContext: async () => {},
  setContext: async () => false,
  flipContext: async () => false,
  returnToPreviousWorkMode: async () => false,
  flipToSupportIfNeeded: async () => false,
  endContext: async () => {},
  setStickyProject: () => {},
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

  // Context Contract v1.0: Sticky project (only changes via dropdown)
  const [stickyProject, setStickyProjectState] = useState<StickyProject | null>(null);

  // Track last context write for heartbeat
  const lastWriteRef = useRef<{ time: number; projectId: string | null; mode: ContextMode }>({
    time: 0,
    projectId: null,
    mode: 'project',
  });

  // Refs for heartbeat to access current values without causing effect re-runs
  const heartbeatDataRef = useRef<{
    effectiveProject: StickyProject | null;
    resolvedMode: ContextMode;
    isSystemTab: boolean;
    pathname: string | null;
    stickyProject: StickyProject | null;
  }>({
    effectiveProject: null,
    resolvedMode: 'project',
    isSystemTab: false,
    pathname: null,
    stickyProject: null,
  });

  const hasActiveContext = !!context;

  // Get current route for mode resolution
  const pathname = usePathname();

  // Context Contract v1.0: Resolve mode from current route
  // Some routes force mode, others inherit (project if stickyProject set, else support)
  const resolvedMode = useMemo((): ContextMode => {
    if (!pathname) return stickyProject ? 'project' : 'support';

    // Routes that force a specific mode
    if (PLANNING_ROUTES.some(r => pathname.startsWith(r))) return 'planning';
    if (FORGE_ROUTES.some(r => pathname.startsWith(r))) return 'forge';
    if (SUPPORT_ROUTES.some(r => pathname.startsWith(r))) return 'support';

    // Inheriting routes: project if stickyProject set, else support
    // This includes session-logs, ai-team, terminal, calendar, dashboard, studio, etc.
    return stickyProject ? 'project' : 'support';
  }, [pathname, stickyProject]);

  // Context Contract v1.0: Detect if on system tab (forces Studios Platform)
  const isSystemTab = useMemo(() => {
    if (!pathname) return false;
    return SYSTEM_ROUTES.some(route => pathname.startsWith(route));
  }, [pathname]);

  // Context Contract v1.0: Compute effective project
  // System tabs force Studios Platform, otherwise use sticky project
  const effectiveProject = useMemo((): StickyProject | null => {
    if (isSystemTab) {
      return {
        id: STUDIOS_PLATFORM_ID,
        slug: STUDIOS_PLATFORM_SLUG,
        name: STUDIOS_PLATFORM_NAME,
      };
    }
    return stickyProject;
  }, [isSystemTab, stickyProject]);

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
        // Also set previousWorkMode if loaded context is project/support
        if (data.context && (data.context.mode === 'project' || data.context.mode === 'support')) {
          setPreviousWorkMode({
            mode: data.context.mode,
            projectId: data.context.project_id || undefined,
            projectSlug: data.context.project_slug || undefined,
            projectName: data.context.project_name || undefined,
          });
        }
      }
    } catch (error) {
      console.error('[UserContext] Failed to fetch context:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, pcTag]);

  const setContext = useCallback(async (params: SetContextParams): Promise<boolean> => {
    if (!userId) return false;

    try {
      const res = await fetch('/api/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          // pc_tag is now 'studio-terminals' (set by API)
          pc_tag_raw: 'dashboard',
          event_type: params.event_type || 'flip',
          meta: params.meta || { route: pathname },
          ...params,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setContextState(data.context);
        // Track last write for heartbeat
        lastWriteRef.current = {
          time: Date.now(),
          projectId: params.project_id || null,
          mode: params.mode,
        };
        return true;
      } else {
        console.error('[UserContext] Failed to set context:', data.error);
        return false;
      }
    } catch (error) {
      console.error('[UserContext] Error setting context:', error);
      return false;
    }
  }, [userId, pathname]);

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
    if (!userId) return;

    try {
      const res = await fetch(`/api/context?user_id=${userId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        setContextState(null);
      }
    } catch (error) {
      console.error('[UserContext] Error ending context:', error);
    }
  }, [userId]);

  // Context Contract v1.0: Set sticky project from dropdown
  // stickyProjectId is NEVER mutated by system tabs - only dropdown changes it
  const setStickyProject = useCallback((project: StickyProject | null) => {
    setStickyProjectState(project);
  }, []);

  // Context Contract v1.0: Write context immediately on flip (effectiveProject or resolvedMode change)
  useEffect(() => {
    if (!userId) return;

    const currentProjectId = effectiveProject?.id || null;
    const hasChanged =
      currentProjectId !== lastWriteRef.current.projectId ||
      resolvedMode !== lastWriteRef.current.mode;

    if (hasChanged) {
      console.log('[UserContext] Context flip:', {
        projectId: currentProjectId,
        mode: resolvedMode,
        isSystemTab,
      });

      setContext({
        mode: resolvedMode,
        project_id: currentProjectId,
        project_slug: effectiveProject?.slug || null,
        project_name: effectiveProject?.name || null,
        source: 'autoflip',
        event_type: 'flip',
        meta: {
          route: pathname,
          isSystemTab,
          stickyProjectId: stickyProject?.id || null,
        },
      });
    }
  }, [userId, effectiveProject, resolvedMode, isSystemTab, pathname, stickyProject, setContext]);

  // Keep heartbeat ref in sync (runs every render, no deps)
  useEffect(() => {
    heartbeatDataRef.current = {
      effectiveProject,
      resolvedMode,
      isSystemTab,
      pathname,
      stickyProject,
    };
  });

  // Context Contract v1.0: Heartbeat every 2 minutes (stable interval)
  // Only depends on userId - doesn't reset on navigation
  useEffect(() => {
    if (!userId) return;

    const heartbeatInterval = setInterval(() => {
      const elapsed = Date.now() - lastWriteRef.current.time;

      // Only write heartbeat if last write is older than 2 minutes
      if (elapsed >= HEARTBEAT_INTERVAL) {
        const data = heartbeatDataRef.current;
        console.log('[UserContext] Heartbeat firing', {
          elapsed: Math.round(elapsed / 1000),
          mode: data.resolvedMode,
          project: data.effectiveProject?.slug,
        });

        // Use fetch directly to avoid setContext dependency
        fetch('/api/context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            pc_tag_raw: 'dashboard',
            mode: data.resolvedMode,
            project_id: data.effectiveProject?.id || null,
            project_slug: data.effectiveProject?.slug || null,
            project_name: data.effectiveProject?.name || null,
            source: 'autoflip',
            event_type: 'heartbeat',
            meta: {
              route: data.pathname,
              isSystemTab: data.isSystemTab,
              stickyProjectId: data.stickyProject?.id || null,
            },
          }),
        }).then(res => res.json()).then(result => {
          if (result.success) {
            lastWriteRef.current.time = Date.now();
            console.log('[UserContext] Heartbeat written');
          }
        }).catch(err => {
          console.error('[UserContext] Heartbeat failed:', err);
        });
      }
    }, HEARTBEAT_INTERVAL);

    return () => clearInterval(heartbeatInterval);
  }, [userId]); // Only userId - stable after login

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
      stickyProject,
      effectiveProject,
      resolvedMode,
      isSystemTab,
      previousWorkMode,
      fetchContext,
      setContext,
      flipContext,
      returnToPreviousWorkMode,
      flipToSupportIfNeeded,
      endContext,
      setStickyProject,
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
