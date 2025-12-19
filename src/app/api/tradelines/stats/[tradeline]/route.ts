import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// Known sources to track
const TRACKED_SOURCES = ['SAM.gov', 'Cal-e-Procure', 'PlanetBids', 'PublicPurchase', 'BidNet'];

// Mapping from display name to database value
const SOURCE_DB_NAMES: Record<string, string> = {
  'Cal-e-Procure': 'CalProcure',
};

// Format bytes to human readable
function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

interface RouteContext {
  params: Promise<{ tradeline: string }>;
}

// GET /api/tradelines/stats/[tradeline] - Get per-tradeline daily stats
export async function GET(request: NextRequest, { params }: RouteContext) {
  const { tradeline } = await params;
  const supabase = createServerClient();

  if (!supabase) {
    return NextResponse.json(
      { success: false, error: 'Supabase not configured' },
      { status: 500 }
    );
  }

  try {
    const OPS_TABLE = `${tradeline}_discovered_opportunities`;
    const DOCS_TABLE = `${tradeline}_discovered_opportunity_documents`;
    const ACTIVITY_TABLE = `${tradeline}_pipeline_activity`;

    // Today's start (midnight)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    // Query all stats in parallel
    const [
      // Total counts
      opsTotal,
      docsTotal,
      // Today's counts
      opsToday,
      docsToday,
      // All ops for source breakdown (today only)
      opsTodayBySource,
      // All ops for stage breakdown (need pipeline_activity)
      activityToday,
      // Storage
      storageInfo,
    ] = await Promise.all([
      supabase.from(OPS_TABLE).select('*', { count: 'exact', head: true }),
      supabase.from(DOCS_TABLE).select('*', { count: 'exact', head: true }),
      supabase.from(OPS_TABLE).select('*', { count: 'exact', head: true }).gte('discovered_at', todayISO),
      supabase.from(DOCS_TABLE).select('*', { count: 'exact', head: true }).gte('uploaded_at', todayISO),
      supabase.from(OPS_TABLE).select('discovery_source').gte('discovered_at', todayISO),
      supabase.from(ACTIVITY_TABLE).select('stage, metrics').gte('timestamp', todayISO),
      supabase.from(DOCS_TABLE).select('file_size'),
    ]);

    // Check if tables exist
    if (opsTotal.error?.message?.includes('does not exist')) {
      return NextResponse.json({
        success: false,
        error: `Tables not found for tradeline: ${tradeline}`,
      }, { status: 404 });
    }

    // Count by source
    const sourceCount: Record<string, number> = {};
    TRACKED_SOURCES.forEach(s => sourceCount[s] = 0);

    if (opsTodayBySource.data) {
      opsTodayBySource.data.forEach((row: { discovery_source: string }) => {
        const dbSource = row.discovery_source;
        const displayName = TRACKED_SOURCES.find(s => {
          const dbName = SOURCE_DB_NAMES[s] || s;
          return dbSource === dbName || dbSource === s;
        });
        if (displayName) {
          sourceCount[displayName]++;
        }
      });
    }

    // Count by stage and sum AI costs
    const stageCount: Record<string, number> = {
      discovery: 0,
      scraping: 0,
      analysis: 0,
      storage: 0,
    };
    let dailyAICost = 0;

    if (activityToday.data) {
      activityToday.data.forEach((row: { stage: string; metrics: Record<string, unknown> }) => {
        // Map stages
        const stage = row.stage?.toLowerCase();
        if (stage?.includes('discover') || stage === 'stage1') stageCount.discovery++;
        else if (stage?.includes('scrap') || stage?.includes('detail') || stage === 'stage2') stageCount.scraping++;
        else if (stage?.includes('analy') || stage?.includes('summar') || stage === 'stage3') stageCount.analysis++;
        else if (stage?.includes('stor') || stage === 'stage4') stageCount.storage++;

        // Sum AI costs
        const metrics = row.metrics || {};
        dailyAICost += Number(metrics.cost) || Number(metrics.ai_cost) || Number(metrics.openai_cost) || 0;
      });
    }

    // Calculate storage
    let storageBytes = 0;
    if (storageInfo.data) {
      storageBytes = storageInfo.data.reduce((sum: number, doc: { file_size: number }) =>
        sum + (doc.file_size || 0), 0
      );
    }

    // Storage limit per tradeline (8 GB)
    const STORAGE_LIMIT = 8 * 1024 * 1024 * 1024;
    const storagePercent = Math.round((storageBytes / STORAGE_LIMIT) * 100 * 10) / 10;

    return NextResponse.json({
      success: true,
      tradeline,
      today: {
        opportunities: opsToday.count || 0,
        documents: docsToday.count || 0,
        aiCost: dailyAICost,
        bySource: sourceCount,
        byStage: stageCount,
      },
      totals: {
        opportunities: opsTotal.count || 0,
        documents: docsTotal.count || 0,
      },
      storage: {
        used: storageBytes,
        usedFormatted: formatBytes(storageBytes),
        limit: STORAGE_LIMIT,
        limitFormatted: '8 GB',
        percent: storagePercent,
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`Stats error for ${tradeline}:`, error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
