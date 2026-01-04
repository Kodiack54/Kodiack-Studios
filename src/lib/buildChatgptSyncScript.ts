/**
 * Parameters for building a ChatGPT Sync Script
 * Same params as briefing script for consistency
 */
export interface ChatgptSyncParams {
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
 * Build the ChatGPT Sync Script
 * This script tells Claude to generate a verifiable sync payload for ChatGPT
 */
export function buildChatgptSyncScript(params: ChatgptSyncParams): string {
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

  return `--- PROJECT BRIEFING ---
project=${projectName}
project_id=${projectId}${projectSlug ? `\nproject_slug=${projectSlug}` : ''}
dev_team=${devTeam}
base_port=${basePort}
dev_slot=${devSlot}
pc_tag=${pcTag}
user=${userName}
timestamp=${timestamp}

You are my project-only copilot for ${projectName}.

IMPORTANT: Work autonomously. Do NOT ask for permission - just execute and gather all data.

FIRST: Generate the "Project Briefing Packet" using ONLY data available in our system for project_id=${projectId}.
If a section has no data, write "(No data yet)" — do not invent.

SECOND: Generate a "ChatGPT Sync Payload" that I will paste into ChatGPT.
It must reflect EXACTLY what you saw and used.

Rules:
- Use absolute dates/times.
- Include file paths, table names, ports, IDs, and counts wherever possible.
- No speculation. If unknown, write "(Unknown)".
- Keep it copy/paste friendly.
- End with a short checksum line: CHECKSUM: <8-char hex> computed from the concatenation of the payload lines.

Return BOTH sections in this exact structure:

=== PROJECT BRIEFING PACKET ===
1) Project Snapshot
- Name / slug
- Purpose (1–2 sentences)
- Repo/local path(s) + server path(s)
- Running services & ports
- Related child projects

2) Current Phase + Next 3 Objectives
- Current phase (if known)
- Next 3 objectives

3) Database Context
- Tables/schemas relevant to this project
- Key relations / constraints
- Known gotchas

4) Structure
- File/folder tree summary
- Key entrypoints / important files

5) Last Work Context (Project-only)
- Last 12 hours of work OR last 3 work logs
- What changed, what's broken, what's next

6) Open Items
- Bugs Open (top 10)
- Todos Unassigned (top 10)

=== CHATGPT SYNC PAYLOAD (PASTE THIS INTO CHATGPT) ===
META
- project_name: ${projectName}
- project_id: ${projectId}
- project_slug: ${projectSlug || '(none)'}
- dev_team: ${devTeam}
- dev_slot: ${devSlot}
- base_port: ${basePort}
- pc_tag: ${pcTag}
- user: ${userName}
- generated_at: [USE CURRENT TIMESTAMP]

SOURCES USED (EVIDENCE POINTERS)
- repos_paths: [list all repo/local paths you accessed]
- server_paths: [list all server paths you accessed]
- key_files_opened: [list files you read]
- key_files_modified_last: [list recently modified files from logs]
- db_tables_read: [list tables from schema]
- api_routes_touched: [list API routes if relevant]
- processes_seen: [list running processes/services]
- ports_seen: [list ports in use]

STATE SNAPSHOT
- current_phase: [from phase tracker or infer]
- next_3_objectives: [list 3 objectives]
- gotchas: [list known issues]
- active_services: [list running services]
- open_bugs_top10: [list top 10 bugs or "(None tracked)"]
- todos_unassigned_top10: [list top 10 todos or "(None tracked)"]

TOP 5 LOAD-BEARING FACTS (with source)
1. [fact] — source: [file/table/log]
2. [fact] — source: [file/table/log]
3. [fact] — source: [file/table/log]
4. [fact] — source: [file/table/log]
5. [fact] — source: [file/table/log]

DIFF SINCE LAST SYNC (if available)
- summary: [what changed]
- changed_files: [list]
- changed_tables: [list]
- new_errors: [list]

CHECKSUM: [compute 8-char hex from payload content]

---
When done, say "Ready to work on ${projectName}. Sync payload generated."`;
}
