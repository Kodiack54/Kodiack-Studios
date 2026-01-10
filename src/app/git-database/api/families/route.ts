/**
 * Git Database Families API
 * GET /git-database/api/families
 * 
 * Returns aggregated family cards (one card per tool/member)
 * with all instances and their sync status.
 */

import { NextResponse } from 'next/server';
import { getFamilySummary } from '../../lib/source';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const result = await getFamilySummary();
  
  // Optional filtering
  const group = searchParams.get('group');
  const state = searchParams.get('state');
  
  let families = result.families;
  
  if (group) {
    families = families.filter(f => f.instance_group === group);
  }
  
  if (state) {
    families = families.filter(f => f.sync.state === state);
  }
  
  // Recount after filtering
  const counts = { total: families.length, green: 0, orange: 0, red: 0, gray: 0 };
  for (const f of families) {
    counts[f.sync.state as keyof typeof counts]++;
  }
  
  return NextResponse.json({
    ...result,
    families,
    counts,
  });
}
