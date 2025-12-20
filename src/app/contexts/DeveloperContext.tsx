'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Developer team definitions with port ranges
export interface DeveloperTeam {
  id: 'dev1' | 'dev2' | 'dev3';
  label: string;
  basePort: number;  // Base port for Claude terminal (5410, 5420, 5430)
  portRange: string; // Display range (5410-5416, 5420-5426, 5430-5436)
}

// AI Worker definitions for each dev slot
export interface AIWorker {
  name: string;
  role: string;
  portOffset: number; // Added to basePort (0=Claude, 1=Chad, 2=Ryan, 3=Susan, 4=Jen, 5=Clair, 6=Mike/Tiffany)
}

export const AI_WORKERS: AIWorker[] = [
  { name: 'Claude', role: 'Lead Developer', portOffset: 0 },
  { name: 'Chad', role: 'Scribe', portOffset: 1 },
  { name: 'Ryan', role: 'Project Manager', portOffset: 2 },
  { name: 'Susan', role: 'Memory Manager', portOffset: 3 },
  { name: 'Jen', role: 'Designer', portOffset: 4 },
  { name: 'Clair', role: 'Code Reviewer', portOffset: 5 },
  { name: 'Mike', role: 'QA Tester', portOffset: 6 },
];

export const DEVELOPER_TEAMS: DeveloperTeam[] = [
  { id: 'dev1', label: 'Dev 1', basePort: 5410, portRange: '5410-5416' },
  { id: 'dev2', label: 'Dev 2', basePort: 5420, portRange: '5420-5426' },
  { id: 'dev3', label: 'Dev 3', basePort: 5430, portRange: '5430-5436' },
];

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface WorkerStatus {
  name: string;
  port: number;
  status: 'offline' | 'starting' | 'online' | 'error';
}

interface DeveloperContextValue {
  // Team selection
  selectedTeam: DeveloperTeam;
  setSelectedTeam: (team: DeveloperTeam) => void;
  selectTeamById: (id: string) => void;

  // Connection state
  connectionStatus: ConnectionStatus;
  workerStatuses: WorkerStatus[];
  lockedUserId: string | null;
  sessionId: string | null;

  // Actions
  connect: (userId: string) => Promise<void>;
  disconnect: () => Promise<void>;
}

const DeveloperContext = createContext<DeveloperContextValue>({
  selectedTeam: DEVELOPER_TEAMS[0],
  setSelectedTeam: () => {},
  selectTeamById: () => {},
  connectionStatus: 'disconnected',
  workerStatuses: [],
  lockedUserId: null,
  sessionId: null,
  connect: async () => {},
  disconnect: async () => {},
});

export function DeveloperProvider({ children }: { children: ReactNode }) {
  const [selectedTeam, setSelectedTeam] = useState<DeveloperTeam>(DEVELOPER_TEAMS[0]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [workerStatuses, setWorkerStatuses] = useState<WorkerStatus[]>([]);
  const [lockedUserId, setLockedUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

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

    setConnectionStatus('connecting');
    setLockedUserId(userId);

    // Initialize worker statuses
    const initialStatuses: WorkerStatus[] = AI_WORKERS.map(worker => ({
      name: worker.name,
      port: selectedTeam.basePort + worker.portOffset,
      status: 'starting',
    }));
    setWorkerStatuses(initialStatuses);

    try {
      // Call API to start/connect workers for this dev slot
      const response = await fetch('/api/dev-session/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          devSlot: selectedTeam.id,
          basePort: selectedTeam.basePort,
          userId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSessionId(data.sessionId);
        setWorkerStatuses(data.workerStatuses || initialStatuses.map(w => ({ ...w, status: 'online' })));
        setConnectionStatus('connected');
      } else {
        throw new Error(data.error || 'Failed to connect');
      }
    } catch (error) {
      console.error('Failed to connect dev session:', error);
      setConnectionStatus('disconnected');
      setLockedUserId(null);
      setWorkerStatuses([]);
    }
  }, [connectionStatus, selectedTeam]);

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
    setWorkerStatuses([]);
  }, [connectionStatus, sessionId, selectedTeam]);

  return (
    <DeveloperContext.Provider value={{
      selectedTeam,
      setSelectedTeam,
      selectTeamById,
      connectionStatus,
      workerStatuses,
      lockedUserId,
      sessionId,
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
