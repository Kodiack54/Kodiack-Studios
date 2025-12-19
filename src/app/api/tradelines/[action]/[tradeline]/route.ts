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
  params: Promise<{ action: string; tradeline: string }>;
}

// POST /api/tradelines/[action]/[tradeline] - Single tradeline actions
export async function POST(request: NextRequest, { params }: RouteContext) {
  const { action, tradeline } = await params;

  switch (action) {
    case 'start':
      return proxyToPatcher(`/server/start/${tradeline}`, 'POST');
    case 'stop':
      return proxyToPatcher(`/server/stop/${tradeline}`, 'POST');
    case 'restart':
      return proxyToPatcher(`/server/restart/${tradeline}`, 'POST');
    case 'deploy':
      const deployBody = await request.json().catch(() => ({}));
      return proxyToPatcher(`/patch/${tradeline}`, 'POST', deployBody);
    case 'exec':
      const execBody = await request.json().catch(() => ({}));
      return proxyToPatcher(`/server/exec/${tradeline}`, 'POST', execBody);
    default:
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
  }
}

// GET /api/tradelines/[action]/[tradeline] - Single tradeline data
export async function GET(request: NextRequest, { params }: RouteContext) {
  const { action, tradeline } = await params;
  const { searchParams } = new URL(request.url);

  switch (action) {
    case 'status':
      return proxyToPatcher(`/server/status/${tradeline}`);
    case 'logs':
      const lines = searchParams.get('lines') || '100';
      const workers = searchParams.get('workers');
      if (workers === 'all') {
        return proxyToPatcher(`/server/logs/${tradeline}?lines=${lines}&workers=all`);
      }
      const worker = searchParams.get('worker') || 'main';
      return proxyToPatcher(`/server/logs/${tradeline}?lines=${lines}&worker=${worker}`);
    case 'config':
      return proxyToPatcher(`/config/${tradeline}`);
    case 'credentials':
      const raw = searchParams.get('raw') === 'true';
      return proxyToPatcher(`/credentials/${tradeline}${raw ? '?raw=true' : ''}`);
    default:
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
  }
}

// PUT /api/tradelines/[action]/[tradeline] - Update tradeline data
export async function PUT(request: NextRequest, { params }: RouteContext) {
  const { action, tradeline } = await params;
  const body = await request.json();

  switch (action) {
    case 'config':
      return proxyToPatcher(`/config/${tradeline}`, 'POST', body);
    case 'credentials':
      return proxyToPatcher(`/credentials/${tradeline}`, 'PUT', body);
    default:
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
  }
}
