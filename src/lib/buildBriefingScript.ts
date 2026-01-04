/**
 * Parameters for building an External Claude Briefing Script
 */
export interface BriefingParams {
  projectName: string;
  projectId: string;
  projectSlug?: string;
  devTeam: string;
  basePort: number;
  devSlot: string;
  pcTag: string;
  userName: string;
  timestamp?: string;
}

/**
 * Build the External Claude Briefing Script
 * Pure function - testable and reusable
 */
export function buildBriefingScript(params: BriefingParams): string {
  const {
    projectName,
    projectId,
    projectSlug,
    devTeam,
    basePort,
    devSlot,
    pcTag,
    userName,
    timestamp = new Date().toISOString(),
  } = params;

  return `/start project=${projectName} project_id=${projectId}${projectSlug ? ` project_slug=${projectSlug}` : ''} dev_team=${devTeam} base_port=${basePort} dev_slot=${devSlot} pc_tag=${pcTag} user=${userName} timestamp=${timestamp}

You are my project-only copilot for ${projectName}. Ignore other projects unless I explicitly switch.

IMPORTANT: Work autonomously. Do NOT ask for permission or confirmation - just execute and gather the data. Use all available tools (Susan, MCP, file reads, etc.) without waiting for approval. When done, output the briefing and say "Ready to work on ${projectName}".

Build me a "Project Briefing Packet" using ONLY the data available in our system for this project_id=${projectId}. If a section has no data, write "(No data yet)"—do not invent.

Return the packet in this exact structure:

1) Project Snapshot
- Name / slug
- Purpose (1–2 sentences, if present in project metadata)
- Repo/local path(s) + server path(s)
- Running services & ports (include ${basePort} terminal base_port context if relevant)
- Related child projects (if tracked under this parent)

2) Current Phase + Next 3 Objectives
- Current phase (if known)
- Next 3 objectives (from roadmap/phase tracker if present; otherwise infer from most recent work logs, citing the log timestamps)

3) Database Context
- Tables/schemas relevant to this project (from Jen schema captures)
- Key relations / constraints
- Known "gotchas" / recurring issues

4) Structure
- File/folder tree summary (from Jen structure tab)
- Key entrypoints / important files
- Any conventions worth remembering (naming, folder rules)

5) Last Work Context (Project-only)
- Summarize the last 12 hours of work OR the last 3 work logs (whichever is available)
- Include timestamps and short bullets:
  - What changed
  - What's broken
  - What's next

6) Open Items
- Bugs Open (counts + top 10 most recent, if available)
- Todos Unassigned (counts + top 10 most recent, if available)
- If these aren't available, say "(Not being extracted right now)" and suggest what data source *does* exist.

Output rules:
- Be concise but complete
- Do not mention Supabase if DB is on the droplet Postgres
- Use absolute dates/times`;
}
