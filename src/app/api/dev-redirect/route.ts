import { NextRequest, NextResponse } from 'next/server';

/**
 * Dev Redirect API
 *
 * Redirects to Dev Studio through the gateway proxy.
 * For local dev: uses localhost gateway proxy to localhost:5000
 * For production: uses remote gateway proxy to dev droplet
 *
 * Usage: /api/dev-redirect
 */
export async function GET(request: NextRequest) {
  // Get gateway token
  const accessToken = request.cookies.get('accessToken')?.value;

  // Determine if we're running locally or on production
  const host = request.headers.get('host') || '';
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1');

  if (!accessToken) {
    // No token - send to gateway login
    const gatewayUrl = isLocal ? 'http://localhost:7000/login' : 'http://134.199.209.140:7000/login';
    return NextResponse.redirect(gatewayUrl);
  }

  // Redirect through gateway proxy (which handles auth and proxies to dev-studio)
  // Local: localhost:7000/dev-studio → localhost:5000
  // Prod: 134.199.209.140:7000/dev-studio → 161.35.229.220:5000
  const devStudioUrl = isLocal ? 'http://localhost:7000/dev-studio' : 'http://134.199.209.140:7000/dev-studio';

  return NextResponse.redirect(devStudioUrl);
}
