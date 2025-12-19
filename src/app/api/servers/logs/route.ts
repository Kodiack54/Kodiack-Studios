import { NextRequest, NextResponse } from 'next/server';

const ENGINE_PATCHER_URL = process.env.ENGINE_PATCHER_URL || 'http://localhost:7101';
const PATCHER_BASE_URL = process.env.PATCHER_URL || 'http://localhost:7100';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source?: string;
  slotId?: string;
  port?: number;
}

interface LogsRequest {
  projectId: string;
  slotId?: string;
  port?: number;
  limit?: number;
  level?: string;
  since?: string;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId') || 'tradelines';
    const slotId = searchParams.get('slotId');
    const port = searchParams.get('port');
    const limit = parseInt(searchParams.get('limit') || '50');
    const level = searchParams.get('level');
    const since = searchParams.get('since');

    let logs: LogEntry[] = [];

    if (projectId === 'tradelines') {
      // Fetch engine logs
      const endpoint = slotId
        ? `${ENGINE_PATCHER_URL}/server/logs/${slotId}`
        : port
        ? `${ENGINE_PATCHER_URL}/server/logs/port/${port}`
        : `${ENGINE_PATCHER_URL}/server/logs`;

      const params = new URLSearchParams();
      if (limit) params.set('limit', String(limit));
      if (level) params.set('level', level);
      if (since) params.set('since', since);

      try {
        const response = await fetch(`${endpoint}?${params}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(10000),
        });

        if (response.ok) {
          const data = await response.json();
          logs = (data.logs || data || []).map((log: any, i: number) => ({
            id: log.id || `log-${Date.now()}-${i}`,
            timestamp: log.timestamp || log.time || new Date().toISOString(),
            level: log.level || 'info',
            message: log.message || log.msg || String(log),
            source: log.source || log.app || 'engine',
            slotId: log.slotId || slotId,
            port: log.port,
          }));
        }
      } catch (error) {
        console.error('Failed to fetch engine logs:', error);
        // Return empty logs on error
      }
    } else {
      // Fetch other project logs
      const patcherPorts: Record<string, number> = {
        sources: 7102,
        nextbidder: 7103,
        portals: 7104,
        nexttech: 7105,
        nexttask: 7106,
      };

      const patcherPort = patcherPorts[projectId];
      if (!patcherPort) {
        return NextResponse.json(
          { success: false, error: `Unknown project: ${projectId}` },
          { status: 400 }
        );
      }

      const patcherUrl = PATCHER_BASE_URL.replace('7100', String(patcherPort));

      try {
        const params = new URLSearchParams();
        if (limit) params.set('limit', String(limit));
        if (level) params.set('level', level);
        if (since) params.set('since', since);

        const response = await fetch(`${patcherUrl}/server/logs?${params}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(10000),
        });

        if (response.ok) {
          const data = await response.json();
          logs = (data.logs || data || []).map((log: any, i: number) => ({
            id: log.id || `log-${Date.now()}-${i}`,
            timestamp: log.timestamp || log.time || new Date().toISOString(),
            level: log.level || 'info',
            message: log.message || log.msg || String(log),
            source: log.source || projectId,
          }));
        }
      } catch (error) {
        console.error(`Failed to fetch ${projectId} logs:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      logs,
      count: logs.length,
      projectId,
      slotId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Logs request failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}
