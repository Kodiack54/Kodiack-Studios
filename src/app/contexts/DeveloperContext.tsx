'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

// Developer team definitions with port ranges
export interface DeveloperTeam {
  id: 'dev1' | 'dev2' | 'dev3';
  label: string;
  basePort: number;  // Base port for Claude terminal (5410, 5420, 5430)
  portRange: string; // Display range (5410-5417, 5420-5427, 5430-5437)
}

// Kodiack AI Team member definitions for each dev slot
export interface AITeamMember {
  name: string;
  role: string;
  portOffset: number; // Added to basePort (0=Claude, 1=Chad, 2=Jen, 3=Susan, 4=Clair, 5=Mike, 6=Tiffany, 7=Ryan)
}

export const KODIACK_AI_TEAM: AITeamMember[] = [
  { name: 'Claude', role: 'Lead Developer', portOffset: 0 },
  { name: 'Chad', role: 'Transcription & Capture', portOffset: 1 },
  { name: 'Jen', role: 'Scrubbing & Signal Extraction', portOffset: 2 },
  { name: 'Susan', role: 'Classification & Sorting', portOffset: 3 },
  { name: 'Clair', role: 'Conversion & Documentation', portOffset: 4 },
  { name: 'Mike', role: 'QA Tester', portOffset: 5 },
  { name: 'Tiffany', role: 'QA Tester', portOffset: 6 },
  { name: 'Ryan', role: 'Roadmap & Prioritization', portOffset: 7 },
];

export const DEVELOPER_TEAMS: DeveloperTeam[] = [
  { id: 'dev1', label: 'Development Team 1', basePort: 5410, portRange: '5410-5417' },
  { id: 'dev2', label: 'Development Team 2', basePort: 5420, portRange: '5420-5427' },
  { id: 'dev3', label: 'Development Team 3', basePort: 5430, portRange: '5430-5437' },
];

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface TeamMemberStatus {
  name: string;
  port: number;
  status: 'offline' | 'starting' | 'online' | 'error';
}

// Parent project for session tracking
export interface ParentProject {
  id: string;
  name: string;
  slug: string;
  server_path?: string;
}

interface DeveloperContextValue {
  // Team selection
  selectedTeam: DeveloperTeam;
  setSelectedTeam: (team: DeveloperTeam) => void;
  selectTeamById: (id: string) => void;

  // Project selection (parent projects only)
  selectedProject: ParentProject | null;
  setSelectedProject: (project: ParentProject | null) => void;

  // Connection state
  connectionStatus: ConnectionStatus;
  teamStatuses: TeamMemberStatus[];
  lockedUserId: string | null;
  sessionId: string | null;
  pcTag: string | null;

  // Actions
  connect: (userId: string) => Promise<void>;
  disconnect: () => Promise<void>;
}

const DeveloperContext = createContext<DeveloperContextValue>({
  selectedTeam: DEVELOPER_TEAMS[0],
  setSelectedTeam: () => {},
  selectTeamById: () => {},
  selectedProject: null,
  setSelectedProject: () => {},
  connectionStatus: 'disconnected',
  teamStatuses: [],
  lockedUserId: null,
  sessionId: null,
  pcTag: null,
  connect: async () => {},
  disconnect: async () => {},
});

// Session storage key for persisting connection state
const SESSION_KEY = 'kodiack_dev_session';

interface PersistedSession {
  teamId: string;
  projectId: string;
  projectName: string;
  projectSlug: string;
  serverPath?: string;
  connectionStatus: ConnectionStatus;
  sessionId: string | null;
  pcTag: string | null;
  lockedUserId: string | null;
}

function loadPersistedSession(): PersistedSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error('Failed to load persisted session:', e);
  }
  return null;
}

function savePersistedSession(session: PersistedSession | null) {
  if (typeof window === 'undefined') return;
  try {
    if (session) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  } catch (e) {
    console.error('Failed to save persisted session:', e);
  }
}

export function DeveloperProvider({ children }: { children: ReactNode }) {
  // Initialize from persisted session
  const [initialized, setInitialized] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<DeveloperTeam>(DEVELOPER_TEAMS[0]);
  const [selectedProject, setSelectedProject] = useState<ParentProject | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [teamStatuses, setTeamStatuses] = useState<TeamMemberStatus[]>([]);
  const [lockedUserId, setLockedUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pcTag, setPcTag] = useState<string | null>(null);

  // Restore session from sessionStorage on mount
  useEffect(() => {
    const persisted = loadPersistedSession();
    if (persisted && persisted.connectionStatus === 'connected') {
      const team = DEVELOPER_TEAMS.find(t => t.id === persisted.teamId);
      if (team) {
        setSelectedTeam(team);
        setSelectedProject({
          id: persisted.projectId,
          name: persisted.projectName,
          slug: persisted.projectSlug,
          server_path: persisted.serverPath,
        });
        setConnectionStatus('connected');
        setSessionId(persisted.sessionId);
        setPcTag(persisted.pcTag);
        setLockedUserId(persisted.lockedUserId);
        // Restore team statuses as online
        setTeamStatuses(KODIACK_AI_TEAM.map(member => ({
          name: member.name,
          port: team.basePort + member.portOffset,
          status: 'online',
        })));
      }
    }
    setInitialized(true);
  }, []);

  const selectTeamById = (id: string) => {
    // Can't change team while connected
    if (connectionStatus === 'connected') return;

    const team = DEVELOPER_TEAMS.find(t => t.id === id);
    if (team) {
      setSelectedTeam(team);
    }
  };

  const connect = useCallback(async (userId: string) => {
    if (connectionStatus !== 'disconnected') return;
    if (!selectedProject) return; // Require project selection

    setConnectionStatus('connecting');
    setLockedUserId(userId);

    // Initialize team member statuses
    const initialStatuses: TeamMemberStatus[] = KODIACK_AI_TEAM.map(member => ({
      name: member.name,
      port: selectedTeam.basePort + member.portOffset,
      status: 'starting',
    }));
    setTeamStatuses(initialStatuses);

    try {
      // Call API to start/connect AI team for this dev slot
      const response = await fetch('/api/dev-session/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          devSlot: selectedTeam.id,
          basePort: selectedTeam.basePort,
          userId,
          projectId: selectedProject.id,
          projectSlug: selectedProject.slug,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSessionId(data.sessionId);
        setPcTag(data.pcTag || null);
        setTeamStatuses(data.teamStatuses || initialStatuses.map(m => ({ ...m, status: 'online' })));
        setConnectionStatus('connected');
        // Persist session to sessionStorage
        savePersistedSession({
          teamId: selectedTeam.id,
          projectId: selectedProject.id,
          projectName: selectedProject.name,
          projectSlug: selectedProject.slug,
          serverPath: selectedProject.server_path,
          connectionStatus: 'connected',
          sessionId: data.sessionId,
          pcTag: data.pcTag || null,
          lockedUserId: userId,
        });
      } else {
        throw new Error(data.error || 'Failed to connect');
      }
    } catch (error) {
      console.error('Failed to connect dev session:', error);
      setConnectionStatus('disconnected');
      setLockedUserId(null);
      setTeamStatuses([]);
    }
  }, [connectionStatus, selectedTeam, selectedProject]);

  const disconnect = useCallback(async () => {
    if (connectionStatus !== 'connected') return;

    try {
      await fetch('/api/dev-session/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          devSlot: selectedTeam.id,
        }),
      });
    } catch (error) {
      console.error('Error disconnecting:', error);
    }

    setConnectionStatus('disconnected');
    setLockedUserId(null);
    setSessionId(null);
    setPcTag(null);
    setTeamStatuses([]);
    // Clear persisted session and briefing flag
    savePersistedSession(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('briefing_shown');
    }
  }, [connectionStatus, sessionId, selectedTeam]);

  return (
    <DeveloperContext.Provider value={{
      selectedTeam,
      setSelectedTeam,
      selectTeamById,
      selectedProject,
      setSelectedProject,
      connectionStatus,
      teamStatuses,
      lockedUserId,
      sessionId,
      pcTag,
      connect,
      disconnect,
    }}>
      {children}
    </DeveloperContext.Provider>
  );
}

export function useDeveloper() {
  const context = useContext(DeveloperContext);
  if (!context) {
    throw new Error('useDeveloper must be used within a DeveloperProvider');
  }
  return context;
}
