/**
 * Operations Types
 * All shared interfaces for the Operations NOC
 */

import { ServiceStatus } from '../config';

// Health check result for a single service
export interface ServiceHealth {
  id: string;
  status: ServiceStatus;
  pm2Status?: 'online' | 'stopped' | 'errored' | 'unknown';
  healthPing?: boolean;
  cpu?: number;
  memory?: number;
  uptime?: number;
  lastEventTime?: number;
  error?: string;
  tailerWarning?: string;  // For user-pc: warning when heartbeat fresh but no transcripts
  gitDriftStatus?: 'green' | 'orange' | 'red' | 'gray';  // Git drift status from canonizer
}

// All services health response
export interface HealthResponse {
  success: boolean;
  services: ServiceHealth[];
  timestamp: number;
}

// Today's pipeline stats
export interface PipelineStats {
  flips: number;
  heartbeats: number;
  transcripts: number;
  sessions: number;
  worklogs: number;
  todos: number;
  bugs: number;
  knowledge: number;
}

export interface StatsResponse {
  success: boolean;
  stats: PipelineStats;
  timestamp: number;
}

// Live feed event
export interface FeedEvent {
  id: string;
  serviceId: string;
  type: 'emit' | 'receive' | 'process' | 'write' | 'error';
  message: string;
  timestamp: number;
  meta?: Record<string, unknown>;
}

// Logs response
export interface LogsResponse {
  success: boolean;
  serviceId: string;
  logs: string[];
  timestamp: number;
}
