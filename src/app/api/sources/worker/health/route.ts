import { NextResponse } from 'next/server';

const WORKER_URL = process.env.SOURCES_WORKER_URL || 'http://localhost:3407';

export async function GET() {
  try {
    const res = await fetch(`${WORKER_URL}/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({ status: 'online', ...data });
    }

    return NextResponse.json({ status: 'degraded' });
  } catch {
    return NextResponse.json({ status: 'offline' });
  }
}
