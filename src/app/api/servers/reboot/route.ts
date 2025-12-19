import { NextRequest, NextResponse } from 'next/server';

const ENGINE_PATCHER_URL = process.env.ENGINE_PATCHER_URL || 'http://localhost:7101';
const PATCHER_BASE_URL = process.env.PATCHER_URL || 'http://localhost:7100';

interface RebootRequest {
  projectId: string;
  slotId?: string;
  tradeline?: string; // tradeline name like 'lowvoltage', 'security', etc.
  target: 'all' | 'main' | number; // 'all' = all workers, 'main' = main only, number = specific port
}

export async function POST(request: NextRequest) {
  try {
    const body: RebootRequest = await request.json();
    const { projectId, slotId, tradeline, target } = body;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Handle Engine (tradelines) reboot
    if (projectId === 'tradelines') {
      if (!tradeline) {
        // Reboot entire engine (all 20 slots)
        const response = await fetch(`${ENGINE_PATCHER_URL}/server/restart-all`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(30000),
        });

        if (!response.ok) {
          const error = await response.text();
          return NextResponse.json(
            { success: false, error: `Engine reboot failed: ${error}` },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Engine reboot initiated for all 20 slots',
          action: 'restart-all',
        });
      }

      // Reboot specific tradeline (all workers)
      // Patcher expects tradeline name like 'lowvoltage', not slotId like '06'
      console.log(`[Reboot] Restarting tradeline: ${tradeline}, target: ${target}`);

      const response = await fetch(`${ENGINE_PATCHER_URL}/server/restart/${tradeline}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(15000),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return NextResponse.json(
          { success: false, error: data.error || `Tradeline reboot failed` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `${tradeline} reboot initiated (${data.processCount || 5} workers)`,
        action: 'restart-tradeline',
        tradeline,
        slotId,
        results: data.results,
      });
    }

    // Handle other projects (simple restart)
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
    const response = await fetch(`${patcherUrl}/server/restart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { success: false, error: `Project reboot failed: ${error}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${projectId} reboot initiated`,
      action: 'restart-project',
      projectId,
    });
  } catch (error) {
    console.error('Reboot request failed:', error);
    return NextResponse.json(
      { success: false, error: 'Reboot request failed' },
      { status: 500 }
    );
  }
}
