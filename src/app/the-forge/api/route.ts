import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Map idea content to forge entry types based on keywords
function detectEntryType(title: string, content: string): string {
  const text = `${title} ${content}`.toLowerCase();

  if (text.includes('game') || text.includes('gameplay') || text.includes('player') || text.includes('quest') || text.includes('chrono')) {
    return 'game';
  }
  if (text.includes('app') || text.includes('mobile') || text.includes('platform') || text.includes('saas') || text.includes('layover')) {
    return 'app';
  }
  if (text.includes('tool') || text.includes('utility') || text.includes('automation') || text.includes('script')) {
    return 'tool';
  }
  if (text.includes('feature') || text.includes('enhancement') || text.includes('improve') || text.includes('add')) {
    return 'feature';
  }
  return 'thought';
}

export async function GET() {
  try {
    const { data: ideas, error } = await db.from('dev_ai_knowledge')
      .select('*')
      .eq('category', 'Ideas')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const ideasArray = ideas as any[] || [];

    const forgeEntries = ideasArray.map((idea) => ({
      id: idea.id,
      title: idea.title,
      summary: idea.summary || (idea.content ? idea.content.substring(0, 300) : ''),
      entry_type: detectEntryType(idea.title || '', idea.content || ''),
      status: idea.project_id ? 'forged' : 'raw',
      project_id: idea.project_id,
      created_at: idea.created_at,
      updated_at: idea.updated_at || idea.created_at,
    }));

    return NextResponse.json(forgeEntries);
  } catch (err) {
    const error = err as Error;
    console.error('Forge API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, content, entry_type } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title required' }, { status: 400 });
    }

    const { data, error } = await db.from('dev_ai_knowledge')
      .insert({
        title,
        content: content || title,
        summary: content ? content.substring(0, 300) : title,
        category: 'Ideas',
        importance: 5,
      })
      .select();

    if (error) throw error;

    const dataArray = data as any[] || [];
    const entry = dataArray[0];

    if (!entry) {
      return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 });
    }

    return NextResponse.json({
      id: entry.id,
      title: entry.title,
      summary: entry.summary,
      entry_type: entry_type || 'thought',
      status: 'raw',
      project_id: null,
      created_at: entry.created_at,
      updated_at: entry.created_at,
    });
  } catch (err) {
    const error = err as Error;
    console.error('Forge POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
