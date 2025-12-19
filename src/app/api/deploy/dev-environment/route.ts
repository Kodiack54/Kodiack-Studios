import { NextRequest, NextResponse } from 'next/server';

// Dev Studio runs on the Dev Droplet at port 5000 (studio) + 5100 (worker)
// This deployment route manages the Dev Studio via the orchestrator

const DEV_DROPLET = '161.35.229.220';
const REMOTE_PATH = '/var/www/NextBid_Dev/dev-studio-5000';
const PM2_NAME = 'dev-studio-5000';
const STUDIO_PORT = 5000;
const WORKER_PORT = 5100;

// The orchestrator on localhost:7100 can handle SSH commands
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:7100';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action = 'deploy' } = body;

    console.log(`[Dev Environment Deploy] Action: ${action}`);

    if (action === 'status') {
      // Check if dev-environment is running via PM2
      const statusRes = await fetch(`${ORCHESTRATOR_URL}/exec`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: `pm2 jlist | jq '.[] | select(.name == "${PM2_NAME}")'`,
        }),
      }).catch(() => null);

      if (statusRes) {
        const status = await statusRes.json();
        return NextResponse.json({
          success: true,
          status: status.output?.includes(PM2_NAME) ? 'online' : 'offline',
          details: status,
        });
      }

      return NextResponse.json({
        success: false,
        status: 'unknown',
        error: 'Could not connect to orchestrator',
      });
    }

    if (action === 'restart') {
      const restartRes = await fetch(`${ORCHESTRATOR_URL}/exec`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: `pm2 restart ${PM2_NAME}`,
        }),
      });

      const result = await restartRes.json();
      return NextResponse.json({
        success: result.success !== false,
        message: 'PM2 restart triggered',
        details: result,
      });
    }

    if (action === 'logs') {
      const logsRes = await fetch(`${ORCHESTRATOR_URL}/exec`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: `pm2 logs ${PM2_NAME} --lines 50 --nostream`,
        }),
      });

      const result = await logsRes.json();
      return NextResponse.json({
        success: true,
        logs: result.output || result.stdout || '',
      });
    }

    // Full deploy: npm install + pm2 restart
    if (action === 'deploy') {
      const deployRes = await fetch(`${ORCHESTRATOR_URL}/exec`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: `cd ${REMOTE_PATH} && npm install --production && pm2 restart ${PM2_NAME} || pm2 start npm --name "${PM2_NAME}" -- start`,
          timeout: 120000, // 2 minutes for npm install
        }),
      });

      const result = await deployRes.json();
      return NextResponse.json({
        success: result.success !== false,
        message: 'Deploy completed',
        details: result,
      });
    }

    return NextResponse.json({
      success: false,
      error: `Unknown action: ${action}`,
    }, { status: 400 });

  } catch (error) {
    console.error('[Dev Environment Deploy] Error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
    }, { status: 500 });
  }
}

export async function GET() {
  // Return status
  try {
    const statusRes = await fetch(`${ORCHESTRATOR_URL}/exec`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: `pm2 jlist 2>/dev/null | jq -r '.[] | select(.name == "${PM2_NAME}") | .pm2_env.status' 2>/dev/null || echo "unknown"`,
      }),
    }).catch(() => null);

    if (statusRes) {
      const result = await statusRes.json();
      const status = result.output?.trim() || 'unknown';
      return NextResponse.json({
        success: true,
        name: PM2_NAME,
        status,
        droplet: DEV_DROPLET,
        studioPort: STUDIO_PORT,
        workerPort: WORKER_PORT,
        path: REMOTE_PATH,
      });
    }

    return NextResponse.json({
      success: false,
      name: PM2_NAME,
      status: 'unknown',
      error: 'Could not connect to orchestrator',
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
    }, { status: 500 });
  }
}
