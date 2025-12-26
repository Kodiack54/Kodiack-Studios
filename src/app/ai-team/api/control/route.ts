import { NextRequest, NextResponse } from 'next/server';

// AI Droplet where workers run
const AI_DROPLET = process.env.AI_DROPLET_URL || 'http://161.35.229.220';

// PM2 control endpoint (needs to be set up on droplet)
const PM2_CONTROL_PORT = 5500; // Dashboard handles PM2 commands

// Worker PM2 name mapping
const PM2_NAMES: Record<string, string> = {
  chad: 'chad-5401',
  jen: 'jen-5402',
  susan: 'susan-5403',
  clair: 'clair-5404',
  mike: 'mike-5405',
  tiffany: 'tiffany-5406',
  ryan: 'ryan-5407',
  terminal: 'terminal-server-5400',
  dashboard: 'kodiack-dashboard-5500',
};

export async function POST(request: NextRequest) {
  try {
    const { workerId, action } = await request.json();

    if (!workerId || !action) {
      return NextResponse.json(
        { success: false, error: 'workerId and action required' },
        { status: 400 }
      );
    }

    if (!['start', 'stop', 'restart'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use: start, stop, restart' },
        { status: 400 }
      );
    }

    const pm2Name = PM2_NAMES[workerId];
    if (!pm2Name) {
      return NextResponse.json(
        { success: false, error: `Unknown worker: ${workerId}` },
        { status: 400 }
      );
    }

    // Send control command to droplet
    // This requires a control API on the droplet (TODO: implement)
    const response = await fetch(`${AI_DROPLET}:${PM2_CONTROL_PORT}/api/pm2/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: pm2Name }),
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({
        success: true,
        message: `${action} ${pm2Name} successful`,
        ...data,
      });
    } else {
      const error = await response.text();
      return NextResponse.json(
        { success: false, error: `Failed to ${action} ${pm2Name}: ${error}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Worker control failed:', error);
    return NextResponse.json(
      { success: false, error: 'Control command failed - droplet may be unreachable' },
      { status: 500 }
    );
  }
}
