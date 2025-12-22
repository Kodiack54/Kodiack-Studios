import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Project Data API Routes
 * Queries dev_ai_* tables directly from PostgreSQL
 * Endpoint format: /api/clair/{type}/{project_path}
 * Types: bugs, todos, journal, docs, knowledge, etc.
 */

// Map endpoint names to database tables
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
  structure: 'dev_ai_structure',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const [endpoint, ...projectParts] = path;
  const projectPath = projectParts.length > 0
    ? '/' + projectParts.join('/')
    : '';

  const tableName = ENDPOINT_TO_TABLE[endpoint];
  if (!tableName) {
    return NextResponse.json(
      { success: false, error: `Unknown endpoint: ${endpoint}` },
      { status: 400 }
    );
  }

  try {
    let query = db.from(tableName)
      .select('*')
      .order('created_at', { ascending: false });

    if (projectPath) {
      query = query.eq('project_path', projectPath);
    }

    const url = new URL(request.url);
    const limit = url.searchParams.get('limit');
    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const { data, error } = await query;

    if (error) {
      console.error('DB query error:', error.message);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Return data in format tabs expect
    const responseKey = endpoint.endsWith('s') ? endpoint : `${endpoint}s`;
    const dataArray = Array.isArray(data) ? data : [];
    return NextResponse.json({
      success: true,
      [responseKey]: dataArray,
      entries: dataArray, // For journal/knowledge tabs that expect 'entries'
      grouped: groupByType(dataArray, endpoint), // For tabs with sub-categories
    });

  } catch (error: any) {
    console.error('API error:', error.message);
    return NextResponse.json(
      { success: false, error: 'Database query failed' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const [endpoint, ...projectParts] = path;
  const projectPath = projectParts.length > 0
    ? '/' + projectParts.join('/')
    : '';

  const tableName = ENDPOINT_TO_TABLE[endpoint];
  if (!tableName) {
    return NextResponse.json(
      { success: false, error: `Unknown endpoint: ${endpoint}` },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const insertData = {
      ...body,
      project_path: projectPath || body.project_path,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await db.from(tableName)
      .insert(insertData)
      .select('id')
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id: data?.id });

  } catch (error: any) {
    console.error('API error:', error.message);
    return NextResponse.json(
      { success: false, error: 'Insert failed' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  // Format: /clair/{endpoint}/{project_path}/{id} or /clair/{endpoint}/{id}
  const [endpoint, ...rest] = path;
  const id = rest[rest.length - 1]; // Last segment is the ID

  const tableName = ENDPOINT_TO_TABLE[endpoint];
  if (!tableName) {
    return NextResponse.json(
      { success: false, error: `Unknown endpoint: ${endpoint}` },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    body.updated_at = new Date().toISOString();

    const { error } = await db.from(tableName)
      .update(body)
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('API error:', error.message);
    return NextResponse.json(
      { success: false, error: 'Update failed' },
      { status: 500 }
    );
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
    return NextResponse.json(
      { success: false, error: `Unknown endpoint: ${endpoint}` },
      { status: 400 }
    );
  }

  try {
    const { error } = await db.from(tableName)
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('API error:', error.message);
    return NextResponse.json(
      { success: false, error: 'Delete failed' },
      { status: 500 }
    );
  }
}

// Helper to group data by type/category for tabs with sub-tabs
function groupByType(data: any[], endpoint: string): Record<string, any[]> {
  const grouped: Record<string, any[]> = {};

  for (const item of data) {
    // Use 'type', 'category', or 'bucket' field for grouping
    const key = item.type || item.category || item.bucket || 'other';
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(item);
  }

  return grouped;
}
