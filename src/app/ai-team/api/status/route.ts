import { NextRequest, NextResponse } from 'next/server';

// AI Droplet where workers run
const AI_DROPLET = process.env.AI_DROPLET_URL || 'http://161.35.229.220';

// AI Team worker definitions
const AI_WORKERS = [
  { id: 'chad', name: 'chad-5401', port: 5401 },
  { id: 'jen', name: 'jen-5402', port: 5402 },
  { id: 'susan', name: 'susan-5403', port: 5403 },
  { id: 'clair', name: 'clair-5404', port: 5404 },
  { id: 'mike', name: 'mike-5405', port: 5405 },
  { id: 'tiffany', name: 'tiffany-5406', port: 5406 },
  { id: 'ryan', name: 'ryan-5407', port: 5407 },
  { id: 'terminal', name: 'terminal-server-5400', port: 5400 },
  { id: 'dashboard', name: 'kodiack-dashboard-5500', port: 5500 },
];

interface WorkerStatus {
  id: string;
  status: 'online' | 'offline' | 'stuck' | 'error';
  uptime?: number;
  lastHeartbeat?: string;
  cpu?: number;
  memory?: number;
  responseTime?: number;
}

// Check individual worker health by hitting their /health endpoint
async function checkWorkerHealth(worker: typeof AI_WORKERS[0]): Promise<WorkerStatus> {
  const startTime = Date.now();

  try {
    const response = await fetch(`${AI_DROPLET}:${worker.port}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      return {
        id: worker.id,
        status: 'online',
        responseTime,
        uptime: data.uptime,
        cpu: data.cpu,
        memory: data.memory,
        lastHeartbeat: new Date().toISOString(),
      };
    } else {
      return {
        id: worker.id,
        status: 'error',
        responseTime,
      };
    }
  } catch (error) {
    // Worker not responding
    return {
      id: worker.id,
      status: 'offline',
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check all workers in parallel
    const workerStatuses = await Promise.all(
      AI_WORKERS.map(worker => checkWorkerHealth(worker))
    );

    return NextResponse.json({
      success: true,
      workers: workerStatuses,
      lastCheck: new Date().toISOString(),
    });
  } catch (error) {
    console.error('AI Team status check failed:', error);
    return NextResponse.json(
      { success: false, error: 'Status check failed' },
      { status: 500 }
    );
  }
}
