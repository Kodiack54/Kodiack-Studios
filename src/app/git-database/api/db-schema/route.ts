/**
 * DB Schema API
 * Fetch schema info for linked repos, return tables/columns/constraints/indexes
 * Used by dashboard to display DB schema and by 9403 to track drift
 */

import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import crypto from 'crypto';

const pool = new Pool({
  host: process.env.PG_HOST || '127.0.0.1',
  port: parseInt(process.env.PG_PORT || '9432'),
  database: process.env.PG_DATABASE || 'kodiack_ai',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'K0d1ack_Pr0d_2025_Rx9',
});

// DB Target connection configs (referenced by db_target_id)
// In production, these would come from a secure secrets store
const DB_TARGETS: Record<string, { host: string; port: number; user: string; password: string }> = {
  'kodiack-local': {
    host: '127.0.0.1',
    port: 9432,
    user: 'postgres',
    password: 'K0d1ack_Pr0d_2025_Rx9'
  },
  // Add more targets as needed
};

interface TableSchema {
  name: string;
  columns: {
    name: string;
    type: string;
    nullable: boolean;
    default: string | null;
  }[];
  constraints: {
    type: string;
    name: string;
    columns: string[];
    references?: { table: string; columns: string[] };
  }[];
  indexes: {
    name: string;
    columns: string[];
    unique: boolean;
  }[];
}

interface SchemaSnapshot {
  db_key: string;
  schema_hash: string;
  captured_at: string;
  tables: TableSchema[];
}

// Generate deterministic hash from schema (sorted/normalized)
function generateSchemaHash(tables: TableSchema[]): string {
  // Sort tables by name
  const sortedTables = [...tables].sort((a, b) => a.name.localeCompare(b.name));
  
  // Sort columns, constraints, indexes within each table
  for (const table of sortedTables) {
    table.columns.sort((a, b) => a.name.localeCompare(b.name));
    table.constraints.sort((a, b) => `${a.type}-${a.name}`.localeCompare(`${b.type}-${b.name}`));
    table.indexes.sort((a, b) => a.name.localeCompare(b.name));
  }
  
  const normalized = JSON.stringify(sortedTables);
  return 'sha256:' + crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}

// Fetch schema from a target database
async function fetchSchemaFromTarget(
  targetId: string,
  dbName: string,
  schemaName: string = 'public'
): Promise<{ tables: TableSchema[]; error?: string }> {
  const targetConfig = DB_TARGETS[targetId];
  if (!targetConfig) {
    return { tables: [], error: `Unknown DB target: ${targetId}` };
  }

  const targetPool = new Pool({
    host: targetConfig.host,
    port: targetConfig.port,
    database: dbName,
    user: targetConfig.user,
    password: targetConfig.password,
  });

  try {
    // Get all tables in schema
    const tablesResult = await targetPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = $1 AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `, [schemaName]);

    const tables: TableSchema[] = [];

    for (const row of tablesResult.rows) {
      const tableName = row.table_name;

      // Get columns
      const columnsResult = await targetPool.query(`
        SELECT 
          column_name as name,
          data_type as type,
          is_nullable = 'YES' as nullable,
          column_default as default
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position
      `, [schemaName, tableName]);

      // Get constraints
      const constraintsResult = await targetPool.query(`
        SELECT 
          tc.constraint_type as type,
          tc.constraint_name as name,
          array_agg(kcu.column_name ORDER BY kcu.ordinal_position) as columns,
          ccu.table_name as ref_table,
          array_agg(ccu.column_name) FILTER (WHERE ccu.column_name IS NOT NULL) as ref_columns
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name 
          AND tc.table_schema = kcu.table_schema
        LEFT JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
          AND tc.table_schema = ccu.table_schema
          AND tc.constraint_type = 'FOREIGN KEY'
        WHERE tc.table_schema = $1 AND tc.table_name = $2
        GROUP BY tc.constraint_type, tc.constraint_name, ccu.table_name
        ORDER BY tc.constraint_name
      `, [schemaName, tableName]);

      // Get indexes
      const indexesResult = await targetPool.query(`
        SELECT 
          i.relname as name,
          array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)) as columns,
          ix.indisunique as unique
        FROM pg_index ix
        JOIN pg_class t ON t.oid = ix.indrelid
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
        WHERE n.nspname = $1 AND t.relname = $2
        GROUP BY i.relname, ix.indisunique
        ORDER BY i.relname
      `, [schemaName, tableName]);

      tables.push({
        name: tableName,
        columns: columnsResult.rows.map(c => ({
          name: c.name,
          type: c.type,
          nullable: c.nullable,
          default: c.default
        })),
        constraints: constraintsResult.rows.map(c => ({
          type: c.type,
          name: c.name,
          columns: c.columns,
          ...(c.ref_table && { references: { table: c.ref_table, columns: c.ref_columns } })
        })),
        indexes: indexesResult.rows.map(i => ({
          name: i.name,
          columns: i.columns,
          unique: i.unique
        }))
      });
    }

    await targetPool.end();
    return { tables };
  } catch (error) {
    await targetPool.end();
    return { tables: [], error: (error as Error).message };
  }
}

// GET - Fetch schema for a repo by slug
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const refresh = searchParams.get('refresh') === 'true';

    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'slug parameter required' },
        { status: 400 }
      );
    }

    // Get repo config
    const repoResult = await pool.query(`
      SELECT repo_slug, db_type, db_target_id, db_name, db_schema,
             db_last_ok_at, db_last_err, db_schema_hash
      FROM ops.repo_registry
      WHERE repo_slug = $1
    `, [slug]);

    if (repoResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Repo not found' },
        { status: 404 }
      );
    }

    const repo = repoResult.rows[0];

    // Check if DB is configured
    if (!repo.db_type || !repo.db_target_id || !repo.db_name) {
      return NextResponse.json({
        success: true,
        configured: false,
        message: 'Database not configured for this repo'
      });
    }

    // Fetch schema from target
    const { tables, error } = await fetchSchemaFromTarget(
      repo.db_target_id,
      repo.db_name,
      repo.db_schema || 'public'
    );

    if (error) {
      // Update repo with error
      await pool.query(`
        UPDATE ops.repo_registry
        SET db_last_err = $1
        WHERE repo_slug = $2
      `, [error, slug]);

      return NextResponse.json({
        success: false,
        configured: true,
        error,
        last_ok_at: repo.db_last_ok_at,
        baseline_hash: repo.db_schema_hash
      });
    }

    // Generate hash
    const schemaHash = generateSchemaHash(tables);
    const now = new Date().toISOString();

    // Check for drift
    const hasDrift = repo.db_schema_hash && repo.db_schema_hash !== schemaHash;

    // Update repo with success
    await pool.query(`
      UPDATE ops.repo_registry
      SET db_last_ok_at = $1, db_last_err = NULL
      WHERE repo_slug = $2
    `, [now, slug]);

    // Build snapshot
    const snapshot: SchemaSnapshot = {
      db_key: `${repo.db_target_id}/${repo.db_name}`,
      schema_hash: schemaHash,
      captured_at: now,
      tables
    };

    return NextResponse.json({
      success: true,
      configured: true,
      snapshot,
      baseline_hash: repo.db_schema_hash,
      has_drift: hasDrift,
      drift_detected: hasDrift ? `Hash changed from ${repo.db_schema_hash} to ${schemaHash}` : null
    });

  } catch (error) {
    console.error('[DB Schema API] GET error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST - Set baseline hash for a repo
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { slug, schema_hash } = body;

    if (!slug || !schema_hash) {
      return NextResponse.json(
        { success: false, error: 'slug and schema_hash required' },
        { status: 400 }
      );
    }

    await pool.query(`
      UPDATE ops.repo_registry
      SET db_schema_hash = $1
      WHERE repo_slug = $2
    `, [schema_hash, slug]);

    return NextResponse.json({
      success: true,
      message: 'Baseline hash set',
      slug,
      schema_hash
    });

  } catch (error) {
    console.error('[DB Schema API] POST error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
