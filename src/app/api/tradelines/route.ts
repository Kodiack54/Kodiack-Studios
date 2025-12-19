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

// GET /api/tradelines - Get all tradelines
export async function GET() {
  return proxyToPatcher('/tradelines');
}

// POST /api/tradelines - Bulk actions
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body;

  switch (action) {
    case 'launch-all':
      return proxyToPatcher('/server/launch-all', 'POST');
    case 'stop-all':
      return proxyToPatcher('/server/stop-all', 'POST');
    case 'restart-all':
      return proxyToPatcher('/server/restart-all', 'POST');
    default:
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
  }
}
