import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const ENDPOINT_TO_TABLE: Record<string, string> = {
  bugs: 'dev_ai_bugs',
  bug: 'dev_ai_bugs',
  todos: 'dev_ai_todos',
  todo: 'dev_ai_todos',
  journal: 'dev_ai_journal',
  knowledge: 'dev_ai_knowledge',
  docs: 'dev_ai_docs',
  doc: 'dev_ai_docs',
  decisions: 'dev_ai_decisions',
  lessons: 'dev_ai_lessons',
  conventions: 'dev_ai_conventions',
  snippets: 'dev_ai_snippets',
};

// Pipeline statuses that should NOT be shown in dashboard
const PIPELINE_STATUSES = ['flagged'];  // pending shows in UI

function groupByType(data: Array<Record<string, unknown>>, endpoint: string): Record<string, Array<Record<string, unknown>>> {
  const grouped: Record<string, Array<Record<string, unknown>>> = {};
  const col: Record<string, string> = {
    docs: 'doc_type', doc: 'doc_type', conventions: 'convention_type',
    knowledge: 'category', journal: 'entry_type',
  };
  const column = col[endpoint] || 'category';
  for (const item of data) {
    const key = (item[column] as string) || 'other';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  }
  return grouped;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const [endpoint, projectId] = path;
  const tableName = ENDPOINT_TO_TABLE[endpoint];
  
  if (!tableName) {
    return NextResponse.json({ success: false, error: 'Unknown endpoint' }, { status: 400 });
  }

  try {
    const url = new URL(request.url);
    const limit = url.searchParams.get('limit');
    const status = url.searchParams.get('status');

    // Build query - filter by project_id UUID
    let query = db.from(tableName).select('*');
    
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    
    // Filter out pipeline statuses unless specifically requested
    if (status) {
      query = query.eq('status', status);
    } else {
      // Exclude items still in pipeline
      for (const ps of PIPELINE_STATUSES) {
        query = query.neq('status', ps);
      }
    }
    
    query = query.order('created_at', { ascending: false });
    
    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const { data, error } = await query;
    
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const responseKey = endpoint.endsWith('s') ? endpoint : endpoint + 's';
    return NextResponse.json({
      success: true,
      [responseKey]: Array.isArray(data) ? data : [],
      entries: Array.isArray(data) ? data : [],
      count: (Array.isArray(data) ? data : []).length,
      grouped: groupByType(Array.isArray(data) ? data : [], endpoint),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const [endpoint, projectId] = path;
  const tableName = ENDPOINT_TO_TABLE[endpoint];

  if (!tableName) {
    return NextResponse.json({ success: false, error: 'Unknown endpoint' }, { status: 400 });
  }

  try {
    const body = await request.json();
    body.project_id = projectId;
    body.created_at = new Date().toISOString();
    body.updated_at = new Date().toISOString();

    const { data, error } = await db.from(tableName).insert(body).select();
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const [endpoint, ...rest] = path;
  const id = rest[rest.length - 1];
  const tableName = ENDPOINT_TO_TABLE[endpoint];
  
  if (!tableName) {
    return NextResponse.json({ success: false, error: 'Unknown endpoint' }, { status: 400 });
  }

  try {
    const body = await request.json();
    body.updated_at = new Date().toISOString();
    const { error } = await db.from(tableName).update(body).eq('id', id);
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const [endpoint, ...rest] = path;
  const id = rest[rest.length - 1];
  const tableName = ENDPOINT_TO_TABLE[endpoint];
  
  if (!tableName) {
    return NextResponse.json({ success: false, error: 'Unknown endpoint' }, { status: 400 });
  }

  try {
    const { error } = await db.from(tableName).delete().eq('id', id);
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
