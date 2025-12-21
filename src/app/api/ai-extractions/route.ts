import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  host: '127.0.0.1',
  port: 9432,
  database: 'kodiack_ai',
  user: 'postgres',
  password: 'kodiack2025',
});

// Jen's 20 extraction buckets mapped to their tables
// Some buckets share tables with a status/type column
const BUCKET_QUERIES: Record<string, string> = {
  'Bugs Open': "SELECT COUNT(*) FROM dev_ai_bugs WHERE status = 'open' OR status IS NULL",
  'Bugs Fixed': "SELECT COUNT(*) FROM dev_ai_bugs WHERE status = 'fixed'",
  'Todos': "SELECT COUNT(*) FROM dev_ai_knowledge WHERE category = 'todo'",
  'Journal': "SELECT COUNT(*) FROM dev_ai_journal",
  'Work Log': "SELECT COUNT(*) FROM dev_ai_knowledge WHERE category = 'work_log'",
  'Ideas': "SELECT COUNT(*) FROM dev_ai_ideas",
  'Decisions': "SELECT COUNT(*) FROM dev_ai_decisions",
  'Lessons': "SELECT COUNT(*) FROM dev_ai_lessons",
  'System Breakdown': "SELECT COUNT(*) FROM dev_ai_docs WHERE doc_type = 'system_breakdown'",
  'How-To Guide': "SELECT COUNT(*) FROM dev_ai_docs WHERE doc_type = 'how_to'",
  'Schematic': "SELECT COUNT(*) FROM dev_ai_docs WHERE doc_type = 'schematic'",
  'Reference': "SELECT COUNT(*) FROM dev_ai_docs WHERE doc_type = 'reference'",
  'Naming Conventions': "SELECT COUNT(*) FROM dev_ai_conventions WHERE convention_type = 'naming'",
  'File Structure': "SELECT COUNT(*) FROM dev_ai_conventions WHERE convention_type = 'file_structure'",
  'Database Patterns': "SELECT COUNT(*) FROM dev_ai_conventions WHERE convention_type = 'database'",
  'API Patterns': "SELECT COUNT(*) FROM dev_ai_conventions WHERE convention_type = 'api'",
  'Component Patterns': "SELECT COUNT(*) FROM dev_ai_conventions WHERE convention_type = 'component'",
  'Quirks & Gotchas': "SELECT COUNT(*) FROM dev_ai_knowledge WHERE category = 'quirks'",
  'Snippets': "SELECT COUNT(*) FROM dev_ai_knowledge WHERE category = 'snippet'",
  'Other': "SELECT COUNT(*) FROM dev_ai_knowledge WHERE category = 'other' OR category IS NULL",
};

// GET - Fetch extraction bucket counts from various tables
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspace = searchParams.get('workspace');

    const buckets: Record<string, number> = {};

    // Query each bucket
    for (const [bucketName, query] of Object.entries(BUCKET_QUERIES)) {
      try {
        // Add workspace filter if provided (assuming tables have workspace column)
        let finalQuery = query;
        if (workspace && !query.includes('WHERE')) {
          finalQuery = query.replace('SELECT COUNT(*)', `SELECT COUNT(*) FROM (${query}) sub WHERE workspace = '${workspace}'`);
        } else if (workspace && query.includes('WHERE')) {
          finalQuery = query + ` AND workspace = '${workspace}'`;
        }

        const result = await pool.query(query); // Use original query for now
        buckets[bucketName] = parseInt(result.rows[0]?.count || '0');
      } catch (err) {
        // Table or column might not exist yet
        buckets[bucketName] = 0;
      }
    }

    // Also get raw table totals for debugging
    const totals: Record<string, number> = {};
    const tableQueries = [
      { name: 'bugs', query: 'SELECT COUNT(*) FROM dev_ai_bugs' },
      { name: 'ideas', query: 'SELECT COUNT(*) FROM dev_ai_ideas' },
      { name: 'decisions', query: 'SELECT COUNT(*) FROM dev_ai_decisions' },
      { name: 'lessons', query: 'SELECT COUNT(*) FROM dev_ai_lessons' },
      { name: 'journal', query: 'SELECT COUNT(*) FROM dev_ai_journal' },
      { name: 'knowledge', query: 'SELECT COUNT(*) FROM dev_ai_knowledge' },
      { name: 'docs', query: 'SELECT COUNT(*) FROM dev_ai_docs' },
      { name: 'conventions', query: 'SELECT COUNT(*) FROM dev_ai_conventions' },
    ];

    for (const { name, query } of tableQueries) {
      try {
        const result = await pool.query(query);
        totals[name] = parseInt(result.rows[0]?.count || '0');
      } catch {
        totals[name] = 0;
      }
    }

    return NextResponse.json({
      success: true,
      buckets,
      totals,
    });
  } catch (error) {
    console.error('Error fetching extraction counts:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch extractions'
    }, { status: 500 });
  }
}
