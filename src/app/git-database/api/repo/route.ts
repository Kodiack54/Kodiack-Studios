/**
 * Git Database Repo Detail API
 * GET /git-database/api/repo?key=...
 */

import { NextResponse } from 'next/server';
import { getRepoDetail } from '../../lib/source';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  
  if (!key) {
    return NextResponse.json(
      { success: false, repo: null, error: 'key parameter required' },
      { status: 400 }
    );
  }

  const result = await getRepoDetail(key);
  
  if (!result.success) {
    return NextResponse.json(result, { status: 404 });
  }
  
  return NextResponse.json(result);
}
