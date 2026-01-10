/**
 * Git Database Summary API
 * GET /git-database/api/summary
 */

import { NextResponse } from 'next/server';
import { getGitSummary } from '../../lib/source';
import type { SummaryFilters, RepoGroup, SyncState } from '../../lib/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const filters: SummaryFilters = {};
  
  const group = searchParams.get('group');
  if (group && ['studio', 'ai-team', 'project'].includes(group)) {
    filters.group = group as RepoGroup;
  }
  
  const service_id = searchParams.get('service_id');
  if (service_id) filters.service_id = service_id;
  
  const project_slug = searchParams.get('project_slug');
  if (project_slug) filters.project_slug = project_slug;
  
  const state = searchParams.get('state');
  if (state && ['green', 'orange', 'red', 'gray'].includes(state)) {
    filters.state = state as SyncState;
  }
  
  if (searchParams.get('active_only') === 'false') {
    filters.active_only = false;
  }

  const result = await getGitSummary(Object.keys(filters).length > 0 ? filters : undefined);
  return NextResponse.json(result);
}
