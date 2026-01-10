import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { STUDIO_SERVICES } from '@/app/operations/config';

export async function GET() {
  try {
    // Get system stats
    let cpu = 0;
    let memory = 0;
    let disk = 0;
    let uptime = '—';

    try {
      // CPU usage (1 min load average as percentage of cores)
      const loadAvg = execSync("cat /proc/loadavg | awk '{print $1}'", { encoding: 'utf8' }).trim();
      const cores = parseInt(execSync('nproc', { encoding: 'utf8' }).trim()) || 1;
      cpu = (parseFloat(loadAvg) / cores) * 100;

      // Memory usage
      const memInfo = execSync("free | grep Mem | awk '{print $3/$2 * 100}'", { encoding: 'utf8' }).trim();
      memory = parseFloat(memInfo) || 0;

      // Disk usage
      const diskInfo = execSync("df / | tail -1 | awk '{print $5}' | tr -d '%'", { encoding: 'utf8' }).trim();
      disk = parseFloat(diskInfo) || 0;

      // Uptime
      const uptimeRaw = execSync('uptime -p', { encoding: 'utf8' }).trim();
      uptime = uptimeRaw.replace('up ', '');
    } catch (e) {
      console.error('Failed to get system stats:', e);
    }

    // Count service health (would normally come from health check)
    // For now, we'll return placeholder counts
    const servicesOnline = STUDIO_SERVICES.length;
    const servicesDegraded = 0;
    const servicesOffline = 0;

    return NextResponse.json({
      success: true,
      status: {
        name: 'Studio-Dev',
        ip: '161.35.229.220',
        cpu,
        memory,
        disk,
        uptime,
        servicesOnline,
        servicesDegraded,
        servicesOffline,
      },
    });
  } catch (error) {
    console.error('Droplet status error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
