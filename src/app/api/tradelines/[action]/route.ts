import { NextRequest, NextResponse } from 'next/server';

const PATCHER_URL = process.env.PATCHER_ENGINE_URL || 'http://134.199.209.140:7101';

async function proxyToPatcher(endpoint: string, method = 'GET', body?: unknown) {
  const config: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };

  if (body && (method === 'POST' || method === 'PUT')) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${PATCHER_URL}${endpoint}`, config);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

interface RouteContext {
  params: Promise<{ action: string }>;
}

// POST /api/tradelines/[action] - Actions like launch-all, stop-all, restart-all
export async function POST(request: NextRequest, { params }: RouteContext) {
  const { action } = await params;

  switch (action) {
    case 'launch-all':
      return proxyToPatcher('/server/launch-all', 'POST');
    case 'stop-all':
      return proxyToPatcher('/server/stop-all', 'POST');
    case 'restart-all':
      return proxyToPatcher('/server/restart-all', 'POST');
    case 'health-all':
      return proxyToPatcher('/server/health-all');
    default:
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
  }
}

// GET /api/tradelines/[action] - Get actions like health-all
export async function GET(request: NextRequest, { params }: RouteContext) {
  const { action } = await params;

  switch (action) {
    case 'health-all':
      return proxyToPatcher('/server/health-all');
    default:
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
  }
}
