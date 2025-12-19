import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// GET /api/dev-controls/analytics/debug - Debug database tables
export async function GET() {
  const supabase = createServerClient();

  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  try {
    // Correct table names
    const OPS_TABLE = 'lowvoltage_discovered_opportunities';
    const DOCS_TABLE = 'lowvoltage_discovered_opportunity_documents';

    // Try to get a sample row from opportunities to see the structure
    const lowvoltageSample = await supabase
      .from(OPS_TABLE)
      .select('*')
      .limit(1);

    // Try to get a sample row from documents
    const docsSample = await supabase
      .from(DOCS_TABLE)
      .select('*')
      .limit(1);

    // Get counts without date filter
    const opsCount = await supabase
      .from(OPS_TABLE)
      .select('*', { count: 'exact', head: true });

    const docsCount = await supabase
      .from(DOCS_TABLE)
      .select('*', { count: 'exact', head: true });

    // Get all unique discovery_source values
    const sources = await supabase
      .from(OPS_TABLE)
      .select('discovery_source');

    // Count by source
    const sourceCounts: Record<string, number> = {};
    if (sources.data) {
      sources.data.forEach((row: { discovery_source: string }) => {
        const src = row.discovery_source || 'unknown';
        sourceCounts[src] = (sourceCounts[src] || 0) + 1;
      });
    }

    return NextResponse.json({
      lowvoltage: {
        sample: lowvoltageSample.data?.[0] || null,
        error: lowvoltageSample.error?.message || null,
        count: opsCount.count,
        countError: opsCount.error?.message || null,
        columns: lowvoltageSample.data?.[0] ? Object.keys(lowvoltageSample.data[0]) : [],
      },
      lowvoltage_documents: {
        sample: docsSample.data?.[0] || null,
        error: docsSample.error?.message || null,
        count: docsCount.count,
        countError: docsCount.error?.message || null,
        columns: docsSample.data?.[0] ? Object.keys(docsSample.data[0]) : [],
      },
      sourceCounts,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
