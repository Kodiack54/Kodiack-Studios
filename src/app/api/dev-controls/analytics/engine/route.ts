import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// Patcher URL to get active tradelines
const TRADELINE_PATCHER_URL = process.env.ENGINE_PATCHER_URL || 'http://134.199.209.140:7101';

// Supabase Pro Plan storage limit (100 GB)
const STORAGE_LIMIT_BYTES = 100 * 1024 * 1024 * 1024; // 100 GB

// Format bytes to human readable
function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Known sources to track (display names)
const TRACKED_SOURCES = ['SAM.gov', 'Cal-e-Procure', 'PlanetBids', 'PublicPurchase', 'BidNet'];

// Mapping from display name to database value (for sources with different DB names)
const SOURCE_DB_NAMES: Record<string, string> = {
  'Cal-e-Procure': 'CalProcure',
};

// Query AI costs from pipeline_activity table
async function queryAICosts(
  supabase: ReturnType<typeof createServerClient>,
  tradeline: string,
  startOfWeek: Date,
  startOfMonth: Date,
  startOfYear: Date
) {
  const ACTIVITY_TABLE = `${tradeline}_pipeline_activity`;

  try {
    // Get all activities that might have costs (detail_scraping for SOW, summarization for AI summary)
    const [allCosts, weekCosts, monthCosts, yearCosts] = await Promise.all([
      supabase!.from(ACTIVITY_TABLE).select('metrics, stage'),
      supabase!.from(ACTIVITY_TABLE).select('metrics, stage').gte('timestamp', startOfWeek.toISOString()),
      supabase!.from(ACTIVITY_TABLE).select('metrics, stage').gte('timestamp', startOfMonth.toISOString()),
      supabase!.from(ACTIVITY_TABLE).select('metrics, stage').gte('timestamp', startOfYear.toISOString()),
    ]);

    // Sum up costs from metrics JSON (check for cost, ai_cost, openai_cost)
    const sumCosts = (data: { metrics: Record<string, unknown>; stage: string }[] | null) => {
      if (!data) return 0;
      return data.reduce((sum, row) => {
        const metrics = row.metrics || {};
        const cost = Number(metrics.cost) || Number(metrics.ai_cost) || Number(metrics.openai_cost) || 0;
        return sum + cost;
      }, 0);
    };

    return {
      week: sumCosts(weekCosts.data),
      month: sumCosts(monthCosts.data),
      year: sumCosts(yearCosts.data),
      allTime: sumCosts(allCosts.data),
    };
  } catch (error) {
    console.error(`Error querying AI costs for ${tradeline}:`, error);
    return { week: 0, month: 0, year: 0, allTime: 0 };
  }
}

// Query stats for a single tradeline
async function queryTradelineStats(
  supabase: ReturnType<typeof createServerClient>,
  tradeline: string,
  startOfWeek: Date,
  startOfMonth: Date,
  startOfYear: Date
) {
  const OPS_TABLE = `${tradeline}_discovered_opportunities`;
  const DOCS_TABLE = `${tradeline}_discovered_opportunity_documents`;

  try {
    const [
      opsTotal,
      opsWeek,
      opsMonth,
      opsYear,
      docsTotal,
      docsWeek,
      docsMonth,
      docsYear,
      storageInfo,
      // Source breakdown queries
      allOpsBySource,
      weekOpsBySource,
      monthOpsBySource,
      yearOpsBySource
    ] = await Promise.all([
      supabase!.from(OPS_TABLE).select('*', { count: 'exact', head: true }),
      supabase!.from(OPS_TABLE).select('*', { count: 'exact', head: true }).gte('discovered_at', startOfWeek.toISOString()),
      supabase!.from(OPS_TABLE).select('*', { count: 'exact', head: true }).gte('discovered_at', startOfMonth.toISOString()),
      supabase!.from(OPS_TABLE).select('*', { count: 'exact', head: true }).gte('discovered_at', startOfYear.toISOString()),
      supabase!.from(DOCS_TABLE).select('*', { count: 'exact', head: true }),
      supabase!.from(DOCS_TABLE).select('*', { count: 'exact', head: true }).gte('uploaded_at', startOfWeek.toISOString()),
      supabase!.from(DOCS_TABLE).select('*', { count: 'exact', head: true }).gte('uploaded_at', startOfMonth.toISOString()),
      supabase!.from(DOCS_TABLE).select('*', { count: 'exact', head: true }).gte('uploaded_at', startOfYear.toISOString()),
      supabase!.from(DOCS_TABLE).select('file_size'),
      // Get all ops with discovery_source for counting
      supabase!.from(OPS_TABLE).select('discovery_source'),
      supabase!.from(OPS_TABLE).select('discovery_source').gte('discovered_at', startOfWeek.toISOString()),
      supabase!.from(OPS_TABLE).select('discovery_source').gte('discovered_at', startOfMonth.toISOString()),
      supabase!.from(OPS_TABLE).select('discovery_source').gte('discovered_at', startOfYear.toISOString())
    ]);

    // Check if tables exist (no error means they exist)
    if (opsTotal.error?.message?.includes('does not exist') ||
        opsTotal.error?.message?.includes('schema cache')) {
      return null; // Tables don't exist yet for this tradeline
    }

    // Calculate storage
    let storageBytes = 0;
    if (storageInfo.data && Array.isArray(storageInfo.data)) {
      storageBytes = storageInfo.data.reduce((sum, doc) => sum + (doc.file_size || 0), 0);
    }

    // Count by source helper
    const countBySource = (data: { discovery_source: string }[] | null) => {
      const counts: Record<string, number> = {};
      TRACKED_SOURCES.forEach(s => counts[s] = 0);
      if (data) {
        data.forEach(row => {
          const dbSource = row.discovery_source;
          // Find matching display name (check both direct match and DB name mapping)
          const displayName = TRACKED_SOURCES.find(s => {
            const dbName = SOURCE_DB_NAMES[s] || s;
            return dbSource === dbName || dbSource === s;
          });
          if (displayName) {
            counts[displayName]++;
          }
        });
      }
      return counts;
    };

    return {
      name: tradeline,
      table: DOCS_TABLE,
      opportunities: {
        week: opsWeek.count || 0,
        month: opsMonth.count || 0,
        year: opsYear.count || 0,
        allTime: opsTotal.count || 0,
      },
      documents: {
        week: docsWeek.count || 0,
        month: docsMonth.count || 0,
        year: docsYear.count || 0,
        allTime: docsTotal.count || 0,
      },
      bySource: {
        allTime: countBySource(allOpsBySource.data),
        week: countBySource(weekOpsBySource.data),
        month: countBySource(monthOpsBySource.data),
        year: countBySource(yearOpsBySource.data),
      },
      storageBytes,
      storage: formatBytes(storageBytes),
      status: 'online' as const,
    };
  } catch (error) {
    console.error(`Error querying ${tradeline}:`, error);
    return null;
  }
}

// GET /api/dev-controls/analytics/engine - Get Engine (tradeline) analytics
export async function GET() {
  const supabase = createServerClient();

  if (!supabase) {
    return NextResponse.json(
      { success: false, error: 'Supabase not configured' },
      { status: 500 }
    );
  }

  try {
    // Get current date boundaries for time-based queries
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Fetch active tradelines from patcher
    let tradelines: string[] = [];
    try {
      const response = await fetch(`${TRADELINE_PATCHER_URL}/tradelines`, {
        cache: 'no-store',
      });
      if (response.ok) {
        const data = await response.json();
        // Extract tradeline names from patcher response
        if (Array.isArray(data)) {
          tradelines = data.map((t: { name?: string } | string) =>
            typeof t === 'string' ? t : t.name
          ).filter((name): name is string => Boolean(name));
        }
      }
    } catch (e) {
      console.warn('Could not fetch tradelines from patcher, using fallback');
    }

    // Fallback to known tradelines if patcher unavailable
    if (tradelines.length === 0) {
      tradelines = ['lowvoltage']; // Add more as they come online
    }

    // Query all tradelines in parallel
    const tradelineResults = await Promise.all(
      tradelines.map(t => queryTradelineStats(supabase, t, startOfWeek, startOfMonth, startOfYear))
    );

    // Query AI costs for all tradelines
    const aiCostResults = await Promise.all(
      tradelines.map(t => queryAICosts(supabase, t, startOfWeek, startOfMonth, startOfYear))
    );

    // Aggregate AI costs
    const totalAICosts = {
      week: aiCostResults.reduce((sum, r) => sum + r.week, 0),
      month: aiCostResults.reduce((sum, r) => sum + r.month, 0),
      year: aiCostResults.reduce((sum, r) => sum + r.year, 0),
      allTime: aiCostResults.reduce((sum, r) => sum + r.allTime, 0),
    };

    // Filter out null results (tradelines without tables)
    const activeResults = tradelineResults.filter(r => r !== null);

    // Initialize source counts
    const initSourceCounts = () => {
      const counts: Record<string, number> = {};
      TRACKED_SOURCES.forEach(s => counts[s] = 0);
      return counts;
    };

    // Aggregate totals
    const totals = {
      opportunities: { week: 0, month: 0, year: 0, allTime: 0 },
      documents: { week: 0, month: 0, year: 0, allTime: 0 },
      storageBytes: 0,
      bySource: {
        week: initSourceCounts(),
        month: initSourceCounts(),
        year: initSourceCounts(),
        allTime: initSourceCounts(),
      },
    };

    for (const result of activeResults) {
      if (result) {
        totals.opportunities.week += result.opportunities.week;
        totals.opportunities.month += result.opportunities.month;
        totals.opportunities.year += result.opportunities.year;
        totals.opportunities.allTime += result.opportunities.allTime;
        totals.documents.week += result.documents.week;
        totals.documents.month += result.documents.month;
        totals.documents.year += result.documents.year;
        totals.documents.allTime += result.documents.allTime;
        totals.storageBytes += result.storageBytes;

        // Aggregate source counts
        if (result.bySource) {
          TRACKED_SOURCES.forEach(source => {
            totals.bySource.week[source] += result.bySource.week[source] || 0;
            totals.bySource.month[source] += result.bySource.month[source] || 0;
            totals.bySource.year[source] += result.bySource.year[source] || 0;
            totals.bySource.allTime[source] += result.bySource.allTime[source] || 0;
          });
        }
      }
    }

    // Build tradelines array for response
    const tradelinesData = activeResults.map(r => ({
      name: r!.name,
      table: r!.table,
      documents: r!.documents.allTime,
      storage: r!.storage,
      storageBytes: r!.storageBytes,
      opportunities: r!.opportunities.allTime,
      status: r!.status,
    }));

    // Calculate storage percentage
    const storagePercentage = Math.round((totals.storageBytes / STORAGE_LIMIT_BYTES) * 100 * 10) / 10;

    return NextResponse.json({
      success: true,
      data: {
        opportunities: totals.opportunities,
        documents: totals.documents,
        bySource: totals.bySource,
        aiCosts: totalAICosts,
        storage: {
          used: {
            bytes: totals.storageBytes,
            formatted: formatBytes(totals.storageBytes),
          },
          limit: {
            bytes: STORAGE_LIMIT_BYTES,
            formatted: formatBytes(STORAGE_LIMIT_BYTES),
          },
          percentage: storagePercentage,
        },
        tradelines: tradelinesData,
        tradelineCount: {
          active: activeResults.length,
          total: tradelines.length,
        },
        lastUpdated: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
