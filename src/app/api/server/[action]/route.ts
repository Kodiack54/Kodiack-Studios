import { NextRequest, NextResponse } from 'next/server';

const PATCHER_URL = process.env.PATCHER_URL || 'http://134.199.209.140:7101';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  const { action } = await params;

  // Extract tradeline from URL if present (e.g., /api/server/start/security)
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const tradeline = pathParts.length > 4 ? pathParts[4] : null;

  let endpoint: string;

  switch (action) {
    case 'start':
      endpoint = `/server/start/${tradeline}`;
      break;
    case 'stop':
      endpoint = `/server/stop/${tradeline}`;
      break;
    case 'restart':
      endpoint = `/server/restart/${tradeline}`;
      break;
    case 'launch-all':
      endpoint = '/server/launch-all';
      break;
    case 'stop-all':
      endpoint = '/server/stop-all';
      break;
    case 'restart-all':
      endpoint = '/server/restart-all';
      break;
    default:
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  }

  try {
    const response = await fetch(`${PATCHER_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  const { action } = await params;

  // For status checks
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const tradeline = pathParts.length > 4 ? pathParts[4] : null;

  let endpoint: string;

  if (action === 'status') {
    endpoint = tradeline ? `/server/status/${tradeline}` : '/server/health-all';
  } else if (action === 'logs') {
    const lines = url.searchParams.get('lines') || '100';
    endpoint = `/server/logs/${tradeline}?lines=${lines}`;
  } else if (action === 'health-all') {
    endpoint = '/server/health-all';
  } else {
    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  }

  try {
    const response = await fetch(`${PATCHER_URL}${endpoint}`);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
