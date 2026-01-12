import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /project-management/api/registry
 * Returns a flat registry of all projects (parent + child) with infrastructure fields
 * This is the single source of truth for project identity + infrastructure
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // Optional: filter by status
    const clientId = searchParams.get('client_id'); // Optional: filter by client

    // Build query for all projects with full infrastructure
    let query = db
      .from('dev_projects')
      .select(`
        id,
        slug,
        name,
        description,
        status,
        is_parent,
        is_main,
        is_active,
        parent_id,
        client_id,
        server_path,
        local_path,
        git_repo,
        droplet_name,
        droplet_ip,
        port_dev,
        port_test,
        port_prod,
        database_schema,
        table_prefix,
        logo_url,
        sort_order,
        created_at,
        updated_at
      `);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    } else {
      // Default: exclude archived
      query = query.neq('status', 'archived');
    }

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data: projects, error } = await query
      .order('is_main', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching project registry:', error);
      return NextResponse.json({ error: 'Failed to fetch registry' }, { status: 500 });
    }

    // Get clients for enrichment
    const { data: clients } = await db
      .from('dev_clients')
      .select('id, name, slug')
      .eq('active', true);

    const clientMap = new Map((clients as Array<{ id: string; name: string; slug: string }> || []).map(c => [c.id, c]));

    // Enrich projects with client info and compute infra_complete
    const registry: Array<Record<string, unknown>> = ((projects || []) as Array<Record<string, unknown>>).map((p) => {
      const client = p.client_id ? clientMap.get(p.client_id as string) : null;
      const infraComplete = !!(p.slug && p.server_path && p.git_repo && p.port_dev);

      return {
        ...p,
        client_name: client?.name || null,
        client_slug: client?.slug || null,
        infra_complete: infraComplete,
      };
    });

    // Build hierarchy map for convenience
    const parentMap: Record<string, unknown[]> = {};
    registry.forEach((p) => {
      if (p.parent_id) {
        if (!parentMap[p.parent_id as string]) {
          parentMap[p.parent_id as string] = [];
        }
        parentMap[p.parent_id as string].push(p);
      }
    });

    return NextResponse.json({
      success: true,
      registry,
      count: registry.length,
      hierarchy: parentMap, // Optional: for UI convenience
    });
  } catch (error) {
    console.error('Error in registry GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
