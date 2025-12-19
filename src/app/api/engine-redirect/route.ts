import { NextRequest, NextResponse } from 'next/server';

/**
 * Engine Redirect API
 *
 * Passes gateway token to engine auth for auto-login, then redirects to target port.
 * No re-login needed - engine auth verifies gateway token and issues its own.
 *
 * Usage: /api/engine-redirect?port=31006
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const port = searchParams.get('port');

  if (!port) {
    return NextResponse.json({ error: 'Port is required' }, { status: 400 });
  }

  // Get gateway token
  const accessToken = request.cookies.get('accessToken')?.value;

  if (!accessToken) {
    // No token - send to gateway login
    return NextResponse.redirect('http://134.199.209.140:7000/login');
  }

  // Send to engine auth with token for auto-login, then redirect to target port
  const engineAuthUrl = `http://64.23.151.201:7000/auto-login?token=${encodeURIComponent(accessToken)}&redirect=${port}`;

  return NextResponse.redirect(engineAuthUrl);
}
