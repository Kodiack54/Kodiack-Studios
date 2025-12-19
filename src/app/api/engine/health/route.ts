import { NextResponse } from 'next/server';
import { defaultTradelines, workerRoles } from '@/config/tradelines';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

type HealthStatus = 'online' | 'offline' | 'degraded';

interface EngineSlot {
  id: string;
  slot_number: number;
  main_port: number;
  host: string;
  assigned_tradeline: string | null;
  tradeline_name?: string;
}

interface ServiceHealth {
  id: string;
  slotId: string;
  slotNumber: number;
  tradeline: string | null;
  tradelineName: string;
  role: string;
  port: number;
  host: string;
  status: HealthStatus;
  responseTime?: number;
}

// Get engine slots from database, fallback to config
async function getEngineSlots(): Promise<Array<{
  id: string;
  slotNumber: number;
  tradeline: string | null;
  tradelineName: string;
  mainPort: number;
  host: string
}>> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.log('No Supabase config, using default tradelines');
      return defaultTradelines.map((t, i) => ({
        id: `slot-${i + 1}`,
        slotNumber: i + 1,
        tradeline: t.id,
        tradelineName: t.name,
        mainPort: t.mainPort,
        host: t.host,
      }));
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get slots with tradeline names joined
    const { data, error } = await supabase
      .from('dev_engine_slots')
      .select(`
        id,
        slot_number,
        main_port,
        host,
        assigned_tradeline,
        dev_tradeline_types ( name )
      `)
      .order('slot_number');

    if (error || !data || data.length === 0) {
      console.log('No engine slots in DB, using defaults:', error?.message);
      return defaultTradelines.map((t, i) => ({
        id: `slot-${i + 1}`,
        slotNumber: i + 1,
        tradeline: t.id,
        tradelineName: t.name,
        mainPort: t.mainPort,
        host: t.host,
      }));
    }

    return data.map((slot: any) => ({
      id: slot.id,
      slotNumber: slot.slot_number,
      tradeline: slot.assigned_tradeline,
      tradelineName: slot.dev_tradeline_types?.name ||
                     (Array.isArray(slot.dev_tradeline_types) && slot.dev_tradeline_types[0]?.name) ||
                     (slot.assigned_tradeline ? slot.assigned_tradeline : 'Unassigned'),
      mainPort: slot.main_port,
      host: slot.host,
    }));
  } catch (err) {
    console.error('Failed to fetch engine slots:', err);
    return defaultTradelines.map((t, i) => ({
      id: `slot-${i + 1}`,
      slotNumber: i + 1,
      tradeline: t.id,
      tradelineName: t.name,
      mainPort: t.mainPort,
      host: t.host,
    }));
  }
}

async function checkHealth(host: string, port: number): Promise<{ status: HealthStatus; responseTime?: number }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    // Try /health first, fall back to root path
    // Any response (even 404) means the server is running
    const res = await fetch(`http://${host}:${port}/health`, {
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeout);
    const responseTime = Date.now() - start;

    // 200 = healthy, 404/other = online but no health endpoint
    if (res.ok) {
      return { status: 'online', responseTime };
    }
    // Got a response but not 200 - server is running (degraded or just no /health route)
    return { status: 'online', responseTime };
  } catch (err) {
    // Fetch failed - could be timeout, connection refused, etc.
    // Try root path as fallback
    try {
      const controller2 = new AbortController();
      const timeout2 = setTimeout(() => controller2.abort(), 2000);

      const res2 = await fetch(`http://${host}:${port}/`, {
        signal: controller2.signal,
        cache: 'no-store',
      });

      clearTimeout(timeout2);
      const responseTime = Date.now() - start;

      // Any response means online
      return { status: 'online', responseTime };
    } catch {
      return { status: 'offline' };
    }
  }
}

export async function GET() {
  const slots = await getEngineSlots();
  const results: ServiceHealth[] = [];
  const checks: Promise<void>[] = [];

  for (const slot of slots) {
    // Check main server
    checks.push(
      checkHealth(slot.host, slot.mainPort).then((health) => {
        results.push({
          id: `${slot.id}-main`,
          slotId: slot.id,
          slotNumber: slot.slotNumber,
          tradeline: slot.tradeline,
          tradelineName: slot.tradelineName,
          role: 'main',
          port: slot.mainPort,
          host: slot.host,
          ...health,
        });
      })
    );

    // Check workers
    for (const worker of workerRoles) {
      const workerPort = slot.mainPort + worker.offset;
      checks.push(
        checkHealth(slot.host, workerPort).then((health) => {
          results.push({
            id: `${slot.id}-${worker.role}`,
            slotId: slot.id,
            slotNumber: slot.slotNumber,
            tradeline: slot.tradeline,
            tradelineName: slot.tradelineName,
            role: worker.role,
            port: workerPort,
            host: slot.host,
            ...health,
          });
        })
      );
    }
  }

  // Run all checks in parallel
  await Promise.all(checks);

  // Sort by slot number and role
  results.sort((a, b) => {
    if (a.slotNumber !== b.slotNumber) return a.slotNumber - b.slotNumber;
    if (a.role === 'main') return -1;
    if (b.role === 'main') return 1;
    return a.port - b.port;
  });

  // Summary stats
  const online = results.filter((r) => r.status === 'online').length;
  const offline = results.filter((r) => r.status === 'offline').length;
  const degraded = results.filter((r) => r.status === 'degraded').length;

  return NextResponse.json({
    total: results.length,
    online,
    offline,
    degraded,
    slots: slots.map((s) => ({
      id: s.id,
      slotNumber: s.slotNumber,
      tradeline: s.tradeline,
      tradelineName: s.tradelineName,
      mainPort: s.mainPort,
    })),
    services: results,
  });
}
