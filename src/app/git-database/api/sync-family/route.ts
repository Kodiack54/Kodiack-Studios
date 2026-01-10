/**
 * Sync Family API - Syncs all instances in a family to the same HEAD
 * 
 * POST /git-database/api/sync-family
 * Body: { family_key: string }
 * 
 * For each out-of-sync instance:
 * 1. git fetch --all
 * 2. git reset --hard origin/<branch>
 * 3. pm2 restart <service_id>
 */

import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Pool } from 'pg';

const execAsync = promisify(exec);

const pool = new Pool({
  host: process.env.PG_HOST || '161.35.229.220',
  port: parseInt(process.env.PG_PORT || '9432'),
  database: process.env.PG_DATABASE || 'kodiack_ai',
  user: process.env.PG_USER || 'kodiack_admin',
  password: process.env.PG_PASSWORD || 'K0d1ack_Pr0d_2025_Rx9',
});

interface SyncResult {
  service_id: string;
  repo_path: string;
  success: boolean;
  old_head?: string;
  new_head?: string;
  error?: string;
}

async function getInstancesForFamily(familyKey: string): Promise<Array<{ service_id: string; repo_path: string }>> {
  const result = await pool.query(`
    SELECT instances, family_key
    FROM ops.repo_registry
    WHERE family_key = $1 AND is_active = true
  `, [familyKey]);
  
  if (result.rows.length === 0) return [];
  return result.rows[0].instances || [];
}

async function getDesiredBranch(familyKey: string): Promise<string> {
  // Get the branch from the first online instance (canonical_state)
  const result = await pool.query(`
    SELECT current_state->>'branch' as branch
    FROM ops.canonical_state
    WHERE id LIKE $1
    AND current_state->>'branch' IS NOT NULL
    ORDER BY id
    LIMIT 1
  `, [`repo:studio-dev:${familyKey.replace('ai-', 'ai-').toLowerCase()}%`]);
  
  return result.rows[0]?.branch || 'main';
}

async function syncInstance(
  repoPath: string,
  serviceId: string,
  branch: string
): Promise<SyncResult> {
  try {
    // Get current HEAD before sync
    const { stdout: oldHead } = await execAsync(`cd "${repoPath}" && git rev-parse HEAD`);
    
    // Fetch all remotes
    await execAsync(`cd "${repoPath}" && git fetch --all`, { timeout: 30000 });
    
    // Reset to origin/branch
    await execAsync(`cd "${repoPath}" && git reset --hard origin/${branch}`, { timeout: 10000 });
    
    // Get new HEAD after sync
    const { stdout: newHead } = await execAsync(`cd "${repoPath}" && git rev-parse HEAD`);
    
    // Find PM2 process name (might be different from service_id)
    // Try common patterns: service_id, or extract port number
    const pm2Name = serviceId.includes('-') ? serviceId : `ai-${serviceId}`;
    
    // Restart PM2 process (don't fail if PM2 restart fails - process might not be running)
    try {
      await execAsync(`pm2 restart ${pm2Name}`, { timeout: 10000 });
    } catch (pm2Err) {
      // Try alternative name patterns
      const altNames = [
        serviceId,
        serviceId.replace('chad-', 'ai-chad-'),
        serviceId.replace('jen-', 'ai-jen-'),
        serviceId.replace('susan-', 'ai-susan-'),
      ];
      
      for (const name of altNames) {
        try {
          await execAsync(`pm2 restart ${name}`, { timeout: 10000 });
          break;
        } catch {
          // Continue trying
        }
      }
    }
    
    return {
      service_id: serviceId,
      repo_path: repoPath,
      success: true,
      old_head: oldHead.trim().slice(0, 7),
      new_head: newHead.trim().slice(0, 7),
    };
  } catch (error) {
    return {
      service_id: serviceId,
      repo_path: repoPath,
      success: false,
      error: (error as Error).message,
    };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { family_key, dry_run = false } = body;
    
    if (!family_key) {
      return NextResponse.json({ 
        success: false, 
        error: 'family_key is required' 
      }, { status: 400 });
    }
    
    // Get all instances for this family
    const instances = await getInstancesForFamily(family_key);
    
    if (instances.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: `No instances found for family: ${family_key}` 
      }, { status: 404 });
    }
    
    // Get the desired branch
    const branch = await getDesiredBranch(family_key);
    
    if (dry_run) {
      return NextResponse.json({
        success: true,
        dry_run: true,
        family_key,
        branch,
        instances: instances.map(i => ({
          service_id: i.service_id,
          repo_path: i.repo_path,
          action: `git fetch --all && git reset --hard origin/${branch} && pm2 restart`
        })),
      });
    }
    
    // Sync all instances
    const results: SyncResult[] = [];
    
    for (const instance of instances) {
      const result = await syncInstance(instance.repo_path, instance.service_id, branch);
      results.push(result);
    }
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    // Log the sync event
    await pool.query(`
      INSERT INTO dev_ops_events (event_type, service_id, metadata, timestamp)
      VALUES ('family_sync', $1, $2, NOW())
    `, [
      family_key,
      JSON.stringify({
        family_key,
        branch,
        success_count: successCount,
        fail_count: failCount,
        results,
      })
    ]);
    
    return NextResponse.json({
      success: failCount === 0,
      family_key,
      branch,
      synced: successCount,
      failed: failCount,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Sync Family] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 });
  }
}
