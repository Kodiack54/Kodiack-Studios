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
import { getUser as getDevUser } from '@/lib/auth-client';

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
// Passive routes - viewing only, don't trigger context flips (preserves current context)
const PASSIVE_ROUTES = ['/operations'];
const STUDIOS_PLATFORM_ID = '21bdd846-7b03-4879-b5ea-04263594da1e'; // Studios Platform UUID from dev_projects
const STUDIOS_PLATFORM_SLUG = 'studios';
const STUDIOS_PLATFORM_NAME = 'Studios Platform';

// The Forge - brainstorming/think tank mode (NOT Elemental Forge game project)
const THE_FORGE_ID = 'the-forge-0000-0000-0000-000000000000';
const THE_FORGE_SLUG = 'the-forge';
const THE_FORGE_NAME = 'The Forge';

const HEARTBEAT_INTERVAL = 120_000; // 2 minutes

// Diagnostic constants - instantly identify host/build/cookie issues
const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || 'dev-' + Date.now().toString(36);
const getOrigin = () => typeof window !== 'undefined' ? window.location.origin : 'server';
const getCookieReadable = () => typeof document !== 'undefined' ? document.cookie.includes('dev_user=') : false;

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

  // Track pathname for restore-on-exit detection
  const prevPathnameRef = useRef<string | null>(null);

  // Save work context before entering Forge/Planning (to restore on leave)
  // Using refs instead of state to avoid effect re-trigger loops
  const savedWorkContextRef = useRef<{ mode: ContextMode; project: StickyProject | null } | null>(null);

  // Guard to prevent immediate override after restore
  const justRestoredRef = useRef<number>(0);

  // Track last context write for heartbeat
  const lastWriteRef = useRef<{ time: number; projectId: string | null; mode: ContextMode }>({
    time: 0,
    projectId: null,
    mode: 'project',
  });

  // Ref for userId so heartbeat can access it without effect dependency
  const userIdRef = useRef<string | null>(null);

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

  // Self-bootstrap identity from auth-7000 cookie (Step 1 of heartbeat fix)
  // This ensures heartbeat works even if ContextWrapper hasn't called setUserIdentity yet
  useEffect(() => {
    const devUser = getDevUser();
    console.log('[UserContext] Bootstrap', {
      origin: getOrigin(),
      build: BUILD_ID,
      cookieReadable: getCookieReadable(),
      rawDevUser: devUser,
      userId: devUser?.id || 'NO USER',
    });
    if (devUser?.id) {
      setUserId(devUser.id);
      setPcTag('studio-terminals');
      userIdRef.current = devUser.id; // Set ref immediately
      console.log('[UserContext] Bootstrap set userId + ref:', devUser.id);
    }
  }, []);

  // Debug tick (10s) - Step 1 diagnostic (NO DB writes)
  // Proves interval alive + identity present
  useEffect(() => {
    console.log('[UserContext] Debug tick mounted', { origin: getOrigin(), build: BUILD_ID });
    const debugInterval = window.setInterval(() => {
      const devUser = getDevUser();
      console.log('[DEBUG TICK]', {
        origin: getOrigin(),
        build: BUILD_ID,
        cookieReadable: getCookieReadable(),
        cookieUserId: devUser?.id || 'null',
        refUserId: userIdRef.current || 'null',
        visible: !document.hidden,
        intervalAlive: true,
      });
    }, 10_000);
    return () => window.clearInterval(debugInterval);
  }, []);

  // Get current route for mode resolution
  const pathname = usePathname();

  // Work context ref - ONLY stores support/project modes, NEVER forge/planning
  // Used by passive routes to restore "work context" without snapping to forced modes
  const workContextRef = useRef<{ mode: ContextMode; project: StickyProject | null }>({
    mode: 'support',
    project: {
      id: STUDIOS_PLATFORM_ID,
      slug: STUDIOS_PLATFORM_SLUG,
      name: STUDIOS_PLATFORM_NAME,
    },
  });

  // Context Contract v1.0: Resolve mode from current route
  // Precedence: 1) Forced routes win, 2) Project selected → project mode, 3) Support
  const isForgeRoute = pathname && FORGE_ROUTES.some(r => pathname.startsWith(r));
  const isPlanningRoute = pathname && PLANNING_ROUTES.some(r => pathname.startsWith(r));

  const resolvedMode = useMemo((): ContextMode => {
    if (!pathname) return stickyProject ? 'project' : 'support';

    // Forced routes always win
    if (isPlanningRoute) return 'planning';
    if (isForgeRoute) return 'forge';

    // Passive routes: project selection forces project mode, otherwise preserve last
    if (PASSIVE_ROUTES.some(r => pathname.startsWith(r))) {
      return stickyProject ? 'project' : workContextRef.current.mode;
    }

    // Support routes force support mode
    if (SUPPORT_ROUTES.some(r => pathname.startsWith(r))) return 'support';

    // Normal routes: project selected → project mode, otherwise support
    return stickyProject ? 'project' : 'support';
  }, [pathname, stickyProject, isPlanningRoute, isForgeRoute]);

  // Context Contract v1.0: Detect if on system tab (forces Studios Platform)
  const isSystemTab = useMemo(() => {
    if (!pathname) return false;
    return SYSTEM_ROUTES.some(route => pathname.startsWith(route));
  }, [pathname]);

  // Context Contract v1.0: Compute effective project
  // - Forge routes → The Forge (always)
  // - Planning routes → stickyProject (the project being planned)
  // - Passive routes → dropdown or last active
  // - System routes → Studios Platform
  // - Otherwise → stickyProject
  const effectiveProject = useMemo((): StickyProject | null => {
    // Forge always uses The Forge project
    if (isForgeRoute) {
      return {
        id: THE_FORGE_ID,
        slug: THE_FORGE_SLUG,
        name: THE_FORGE_NAME,
      };
    }
    // Planning uses the project being planned (stickyProject)
    if (isPlanningRoute) {
      return stickyProject;
    }
    // Passive routes: dropdown selection or preserve last active
    if (pathname && PASSIVE_ROUTES.some(r => pathname.startsWith(r))) {
      return stickyProject || workContextRef.current.project;
    }
    // System routes force Studios Platform
    if (isSystemTab) {
      return {
        id: STUDIOS_PLATFORM_ID,
        slug: STUDIOS_PLATFORM_SLUG,
        name: STUDIOS_PLATFORM_NAME,
      };
    }
    return stickyProject;
  }, [isSystemTab, stickyProject, pathname, isForgeRoute, isPlanningRoute]);

  // Update workContextRef ONLY when mode is support/project (work modes)
  // This ensures passive routes can never restore to forge/planning
  useEffect(() => {
    if (!pathname) return;
    const isPassive = PASSIVE_ROUTES.some(r => pathname.startsWith(r));
    if (isPassive) return;

    // Only save work modes (support/project) - never forge/planning
    if (resolvedMode === 'support' || resolvedMode === 'project') {
      workContextRef.current = {
        mode: resolvedMode,
        project: effectiveProject,
      };
    }
  }, [pathname, resolvedMode, effectiveProject]);

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

  // Forge/Planning enter/exit: Save work context on enter, restore + emit flip on exit
  // Uses pathname-based detection for reliable route transitions
  // Only depends on pathname and userId to avoid re-trigger loops
  useEffect(() => {
    if (!pathname || !userId) return;

    const prevPath = prevPathnameRef.current;
    const wasForge = prevPath && FORGE_ROUTES.some(r => prevPath.startsWith(r));
    const wasPlanning = prevPath && PLANNING_ROUTES.some(r => prevPath.startsWith(r));
    const wasForced = wasForge || wasPlanning;

    const isForge = FORGE_ROUTES.some(r => pathname.startsWith(r));
    const isPlanning = PLANNING_ROUTES.some(r => pathname.startsWith(r));
    const isForced = isForge || isPlanning;

    // DEBUG: Log every pathname transition
    console.log('[UserContext] Restore effect - pathname transition:', {
      prevPath,
      pathname,
      wasForced,
      isForced,
      savedContext: savedWorkContextRef.current,
    });

    // ENTERING Forge/Planning from non-forced route
    if (isForced && !wasForced && prevPath !== null) {
      // Save current work context before entering forced mode
      // Read stickyProject from current state at this moment
      const currentProject = stickyProject;
      const currentMode = currentProject ? 'project' : 'support';

      savedWorkContextRef.current = {
        mode: currentMode,
        project: currentProject,
      };

      console.log('[UserContext] ENTERING forced mode - saved:', {
        mode: currentMode,
        project: currentProject?.slug,
        entering: isForge ? 'forge' : 'planning',
      });
    }

    // LEAVING Forge/Planning to non-forced route
    if (wasForced && !isForced) {
      const saved = savedWorkContextRef.current;
      const restoreMode = saved?.mode || 'support';
      const restoreProject = saved?.project || null;

      console.log('[UserContext] LEAVING forced mode - restoring:', {
        mode: restoreMode,
        project: restoreProject?.slug,
        exited: wasForge ? 'forge' : 'planning',
      });

      // Set guard to prevent immediate override
      justRestoredRef.current = Date.now();

      // Update lastWriteRef SYNCHRONOUSLY before async setContext
      lastWriteRef.current = {
        time: Date.now(),
        projectId: restoreProject?.id || null,
        mode: restoreMode,
      };

      // Update heartbeatDataRef to ensure heartbeat uses correct values immediately
      heartbeatDataRef.current = {
        ...heartbeatDataRef.current,
        effectiveProject: restoreProject,
        resolvedMode: restoreMode,
        stickyProject: restoreProject,
      };

      // Restore sticky project state
      if (restoreProject) {
        setStickyProjectState(restoreProject);
      }

      // Emit explicit context_flip for restore
      setContext({
        mode: restoreMode,
        project_id: restoreProject?.id || null,
        project_slug: restoreProject?.slug || null,
        project_name: restoreProject?.name || null,
        source: 'autoflip',
        event_type: 'flip',
        meta: {
          route: pathname,
          restored_from: wasForge ? 'forge' : 'planning',
          restore_flip: true,
        },
      });

      // Clear saved context
      savedWorkContextRef.current = null;
    }

    prevPathnameRef.current = pathname;
  }, [pathname, userId, stickyProject, setContext]);

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
  // Passive routes (like /operations) only block MODE changes, NOT project changes from dropdown
  useEffect(() => {
    if (!userId) return;

    // Guard: Skip if we just restored from forge/planning (restore effect handles the flip)
    // This prevents the async timing issue where auto-flip runs before restore's setContext completes
    const timeSinceRestore = Date.now() - justRestoredRef.current;
    if (timeSinceRestore < 500) {
      console.log('[UserContext] Skipping auto-flip - just restored from forced mode', { timeSinceRestore });
      return;
    }

    const currentProjectId = effectiveProject?.id || null;
    const modeChanged = resolvedMode !== lastWriteRef.current.mode;
    const projectChanged = currentProjectId !== lastWriteRef.current.projectId;
    const hasChanged = modeChanged || projectChanged;

    // Passive routes only block mode-only flips - project changes from dropdown always go through
    const isPassiveRoute = pathname && PASSIVE_ROUTES.some(route => pathname.startsWith(route));
    if (isPassiveRoute && modeChanged && !projectChanged) {
      console.log('[UserContext] Passive route blocking mode-only flip:', pathname, resolvedMode);
      return;
    }

    if (hasChanged) {
      console.log('[UserContext] Context flip:', {
        projectId: currentProjectId,
        projectSlug: effectiveProject?.slug,
        mode: resolvedMode,
        modeChanged,
        projectChanged,
        isSystemTab,
        isPassiveRoute,
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
          modeChanged,
          projectChanged,
        },
      });
    }
  }, [userId, effectiveProject, resolvedMode, isSystemTab, pathname, stickyProject, setContext]);

  // Keep refs in sync (runs every render, no deps)
  useEffect(() => {
    userIdRef.current = userId;
    heartbeatDataRef.current = {
      effectiveProject,
      resolvedMode,
      isSystemTab,
      pathname,
      stickyProject,
    };
  });

  // Context Contract v1.0: Heartbeat - bulletproof unconditional interval
  // Ticks every 30s, sends only if 2+ minutes since last write
  // Uses refs for all values - NO dependencies
  useEffect(() => {
    console.log('[UserContext] Heartbeat effect mounted');

    const heartbeatInterval = window.setInterval(() => {
      const currentUserId = userIdRef.current;
      const elapsed = Date.now() - lastWriteRef.current.time;
      const data = heartbeatDataRef.current;
      const sig = `${data.effectiveProject?.id || 'null'}|${data.resolvedMode}|${data.isSystemTab}`;

      console.log('[UserContext] Heartbeat tick', {
        userId: currentUserId ? 'set' : 'null',
        hidden: document.hidden,
        elapsed: Math.round(elapsed / 1000),
        threshold: HEARTBEAT_INTERVAL / 1000,
        sig,
        lastWriteTime: lastWriteRef.current.time,
      });

      // Skip if no user, tab hidden, or recent write
      if (!currentUserId) return;
      if (document.hidden) return;
      if (elapsed < HEARTBEAT_INTERVAL) return;

      // Skip heartbeat writes on passive routes (Operations is read-only - never writes context)
      const currentPathname = data.pathname;
      if (currentPathname && PASSIVE_ROUTES.some(r => currentPathname.startsWith(r))) {
        console.log('[UserContext] Heartbeat skipped - passive route:', currentPathname);
        return;
      }

      console.log('[UserContext] Heartbeat firing', {
        mode: data.resolvedMode,
        project: data.effectiveProject?.slug,
        sig,
      });

      // Use fetch directly - refs for all values
      const payload = {
        user_id: currentUserId,
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
          client_ts: Date.now(),
        },
      };
      console.log('[UserContext] Heartbeat sending payload:', payload);

      fetch('/api/context', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(async res => {
        const result = await res.json();
        console.log('[UserContext] Heartbeat response:', { status: res.status, result });
        if (result.success) {
          lastWriteRef.current.time = Date.now();
          console.log('[UserContext] Heartbeat written successfully');
        } else {
          console.error('[UserContext] Heartbeat API error:', result.error);
        }
      }).catch(err => {
        console.error('[UserContext] Heartbeat fetch failed:', err);
      });
    }, 30_000); // Tick every 30 seconds

    return () => window.clearInterval(heartbeatInterval);
  }, []); // NO dependencies - unconditional interval

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
