import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const ITEM_TABLES = [
  "dev_ai_todos",
  "dev_ai_bugs",
  "dev_ai_knowledge",
  "dev_ai_docs",
  "dev_ai_journal",
  "dev_ai_conventions",
  "dev_ai_snippets",
  "dev_ai_decisions",
  "dev_ai_lessons",
];

export async function GET(request: NextRequest) {
  try {
    // 1. Session counts from dev_session_logs (Chad's output)
    const { data: sessions } = await db.from("dev_session_logs").select("status, created_at");

    const sessionList = Array.isArray(sessions) ? sessions : [];
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;

    // 5-stage session lifecycle: active → processed → extracted → cleaned → archived
    let activeSessions = 0, processedSessions = 0, extractedSessions = 0, cleanedSessions = 0, archivedSessions = 0, last24h = 0;
    for (const s of sessionList) {
      const status = (s as Record<string, unknown>).status as string;
      const createdAt = (s as Record<string, unknown>).created_at as string;
      if (status === "active") activeSessions++;
      else if (status === "processed") processedSessions++;
      else if (status === "extracted") extractedSessions++;
      else if (status === "cleaned") cleanedSessions++;
      else if (status === "archived") archivedSessions++;
      if (createdAt) {
        const startTime = new Date(createdAt).getTime();
        if (now.getTime() - startTime < day) last24h++;
      }
    }

    // 2. Item counts by status using raw SQL
    let totalFlagged = 0, totalPending = 0, totalFinal = 0;

    for (const table of ITEM_TABLES) {
      try {
        const flaggedResult = await db.query<{ count: string }>(`SELECT COUNT(*) as count FROM ${table} WHERE status = 'flagged'`);
        const pendingResult = await db.query<{ count: string }>(`SELECT COUNT(*) as count FROM ${table} WHERE status = 'pending'`);
        const finalResult = await db.query<{ count: string }>(`SELECT COUNT(*) as count FROM ${table} WHERE status NOT IN ('flagged', 'pending')`);

        totalFlagged += parseInt((flaggedResult.data as { count: string }[])?.[0]?.count || "0", 10);
        totalPending += parseInt((pendingResult.data as { count: string }[])?.[0]?.count || "0", 10);
        totalFinal += parseInt((finalResult.data as { count: string }[])?.[0]?.count || "0", 10);
      } catch {}
    }

    return NextResponse.json({
      success: true,
      // Session lifecycle: active → processed → extracted → cleaned → archived
      sessions: {
        active: activeSessions,
        processed: processedSessions,
        extracted: extractedSessions,
        cleaned: cleanedSessions,
        archived: archivedSessions,
        total: sessionList.length,
        last_24h: last24h,
      },
      // Item counts (for backward compat, kept as buckets)
      buckets: {
        active: activeSessions,
        processed: processedSessions,
        extracted: extractedSessions,
        cleaned: cleanedSessions,
        archived: archivedSessions,
        flagged: totalFlagged,
        pending: totalPending,
        published: totalFinal,
      },
      stats: {
        total_sessions: sessionList.length,
        active: activeSessions,
        processed: processedSessions,
        extracted: extractedSessions,
        cleaned: cleanedSessions,
        archived: archivedSessions,
        flagged: totalFlagged,
        pending: totalPending,
        last_24h: last24h,
        last_session: sessionList.length > 0 ? (sessionList[0] as Record<string, unknown>).created_at : null,
      },
    });
  } catch (error) {
    console.error("Error fetching bucket counts:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to fetch buckets"
    }, { status: 500 });
  }
}
