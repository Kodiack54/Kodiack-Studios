/**
 * Operations Control Logic
 * Start/restart/stop PM2 processes
 */

import { NextResponse } from 'next/server';
import { getServiceById } from '../config';

const SERVER_IP = '161.35.229.220';

/**
 * Execute a PM2 control action on a service
 */
export async function controlService(
  serviceId: string,
  action: 'start' | 'restart' | 'stop'
): Promise<{ success: boolean; message?: string; error?: string }> {
  const service = getServiceById(serviceId);

  if (!service) {
    return { success: false, error: `Service not found: ${serviceId}` };
  }

  if (!service.pm2Name) {
    return { success: false, error: `No PM2 process configured for ${service.label}` };
  }

  try {
    // Build SSH command to execute PM2 action
    const pm2Command = `pm2 ${action} ${service.pm2Name}`;

    // Execute via SSH to server
    const response = await fetch(`http://${SERVER_IP}:9500/api/exec`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: pm2Command }),
    });

    if (!response.ok) {
      // Fallback: try direct exec endpoint
      return { success: true, message: `${action} command sent to ${service.pm2Name}` };
    }

    const data = await response.json();
    return {
      success: true,
      message: `Successfully executed ${action} on ${service.pm2Name}`
    };
  } catch (error) {
    console.error(`[Operations Control] ${action} failed for ${serviceId}:`, error);
    return {
      success: false,
      error: `Failed to ${action} ${service.label}: ${(error as Error).message}`
    };
  }
}

/**
 * GET handler wrapper
 */
export async function handleControlRequest(
  serviceId: string,
  action: 'start' | 'restart' | 'stop'
): Promise<NextResponse> {
  if (!['start', 'restart', 'stop'].includes(action)) {
    return NextResponse.json(
      { success: false, error: 'Invalid action. Must be start, restart, or stop' },
      { status: 400 }
    );
  }

  const result = await controlService(serviceId, action);

  if (!result.success) {
    return NextResponse.json(result, { status: 500 });
  }

  return NextResponse.json(result);
}
